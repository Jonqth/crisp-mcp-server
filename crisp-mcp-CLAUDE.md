# Crisp MCP Server — Plan d'implémentation

## Contexte du projet

Développer un MCP (Model Context Protocol) server pour Crisp.chat permettant à Claude et autres LLMs d'interagir avec la plateforme Crisp. Deux capacités cibles :
1. **Recherche dans les conversations** (full-text, filtres)
2. **Extraction de métriques/analytics**

## Stack technique

- **Runtime** : Node.js 20+
- **Langage** : TypeScript
- **MCP SDK** : `@modelcontextprotocol/sdk` (SDK officiel Anthropic)
- **API client** : `crisp-api` (wrapper officiel Crisp)
- **Transport** : `stdio` (compatible Claude Desktop / Cowork)

---

## PHASE 1 — Scaffold du projet

### Commandes de setup

```bash
mkdir crisp-mcp-server && cd crisp-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk crisp-api dotenv
npm install -D typescript @types/node tsx
npx tsc --init
```

### Structure de fichiers à créer

```
crisp-mcp-server/
├── src/
│   ├── index.ts           # Point d'entrée MCP server
│   ├── crisp-client.ts    # Singleton Crisp API client (auth)
│   ├── tools/
│   │   ├── search.ts      # Outils de recherche de conversations
│   │   └── analytics.ts   # Outils de métriques
│   └── utils/
│       └── formatters.ts  # Formatage des réponses pour LLM
├── .env.example
├── package.json
└── tsconfig.json
```

### Fichier `.env.example` à créer

```env
CRISP_IDENTIFIER=your_plugin_id_here
CRISP_KEY=your_plugin_secret_here
CRISP_WEBSITE_ID=your_website_id_here
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### `package.json` scripts à ajouter

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "bin": {
    "crisp-mcp": "./dist/index.js"
  }
}
```

---

## PHASE 2 — Client Crisp (`src/crisp-client.ts`)

```typescript
import Crisp from "crisp-api";
import * as dotenv from "dotenv";

dotenv.config();

const CrispClient = new Crisp();

const IDENTIFIER = process.env.CRISP_IDENTIFIER;
const KEY = process.env.CRISP_KEY;
export const WEBSITE_ID = process.env.CRISP_WEBSITE_ID;

if (!IDENTIFIER || !KEY || !WEBSITE_ID) {
  throw new Error(
    "Missing required env vars: CRISP_IDENTIFIER, CRISP_KEY, CRISP_WEBSITE_ID"
  );
}

CrispClient.authenticateTier("plugin", IDENTIFIER, KEY);

export default CrispClient;
```

---

## PHASE 3 — Outils de recherche (`src/tools/search.ts`)

### Outil 1 : `search_conversations`

**Description MCP** : Recherche des conversations Crisp par texte, segment ou filtres.

**Paramètres d'entrée (JSON Schema)** :
```json
{
  "query": { "type": "string", "description": "Texte à rechercher dans les conversations" },
  "page": { "type": "number", "description": "Numéro de page (défaut: 1)", "default": 1 },
  "search_type": {
    "type": "string",
    "enum": ["text", "segment", "data"],
    "description": "Type de recherche",
    "default": "text"
  },
  "date_from": { "type": "string", "description": "Date ISO 8601 de début (optionnel)" },
  "date_to": { "type": "string", "description": "Date ISO 8601 de fin (optionnel)" }
}
```

**Logique** :
```typescript
const result = await CrispClient.website.searchConversations(
  WEBSITE_ID,
  page,
  query,
  search_type,
  "and",     // search_operator
  false      // include_empty
);
// Retourner: session_id, email visiteur, dernier message, date, statut
```

**Format de réponse LLM** :
```
Trouvé X conversations pour "${query}":

1. [ID: abc123] jean@example.com — "Sujet du dernier message..." (il y a 2h, statut: pending)
2. [ID: def456] marie@example.com — "Autre sujet..." (il y a 1j, statut: resolved)
...
```

---

### Outil 2 : `get_conversation`

**Description MCP** : Récupère le détail d'une conversation et ses messages.

**Paramètres** :
```json
{
  "session_id": { "type": "string", "description": "Identifiant de session de la conversation" },
  "messages_limit": { "type": "number", "description": "Nombre max de messages à retourner", "default": 20 }
}
```

**Logique** :
1. `CrispClient.website.getConversation(WEBSITE_ID, session_id)`
2. `CrispClient.website.getMessagesInConversation(WEBSITE_ID, session_id)`
3. Formater en thread lisible (date, auteur, contenu)

---

### Outil 3 : `list_conversations`

**Description MCP** : Liste les conversations avec filtres de statut et segment.

**Paramètres** :
```json
{
  "status": {
    "type": "string",
    "enum": ["pending", "ongoing", "resolved", "unassigned"],
    "description": "Filtre par statut"
  },
  "page": { "type": "number", "default": 1 }
}
```

---

## PHASE 4 — Outils métriques (`src/tools/analytics.ts`)

### Outil 4 : `get_analytics`

**Description MCP** : Retourne les métriques clés Crisp sur une période donnée.

**Paramètres** :
```json
{
  "date_from": { "type": "string", "description": "Date ISO début (ex: 2026-02-01)" },
  "date_to": { "type": "string", "description": "Date ISO fin (ex: 2026-03-01)" },
  "metrics": {
    "type": "array",
    "items": {
      "enum": ["conversations_total", "response_time", "resolution_time", "csat_score"]
    },
    "description": "Métriques à retourner (toutes si non spécifié)"
  }
}
```

**Logique** :
```typescript
const analytics = await CrispClient.website.generateAnalytics(
  WEBSITE_ID,
  {
    date_from: new Date(date_from).getTime() / 1000,
    date_to: new Date(date_to).getTime() / 1000,
    metrics: metrics || ["conversations_total", "response_time", "resolution_time"]
  }
);
```

**Format de réponse LLM** :
```
Métriques Crisp du 01/02/2026 au 01/03/2026 :

📊 Conversations totales : 342
⏱️  Temps de réponse moyen : 4m 32s
✅ Temps de résolution moyen : 1h 12m
⭐ Score CSAT : 4.3/5 (87 évaluations)
```

---

### Outil 5 : `get_operator_stats`

**Description MCP** : Performance des opérateurs sur une période.

**Paramètres** : `date_from`, `date_to`

**Logique** : Query analytics avec groupBy opérateur, retourner tableau trié par volume.

---

## PHASE 5 — Point d'entrée MCP (`src/index.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { searchConversationsTool, handleSearchConversations } from "./tools/search.js";
import { getAnalyticsTool, handleGetAnalytics } from "./tools/analytics.js";

const server = new Server(
  { name: "crisp-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Déclarer les outils disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    searchConversationsTool,
    getConversationTool,
    listConversationsTool,
    getAnalyticsTool,
    getOperatorStatsTool,
  ],
}));

// Router les appels d'outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "search_conversations":     return handleSearchConversations(args);
    case "get_conversation":         return handleGetConversation(args);
    case "list_conversations":       return handleListConversations(args);
    case "get_analytics":            return handleGetAnalytics(args);
    case "get_operator_stats":       return handleGetOperatorStats(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Démarrer le transport stdio
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Crisp MCP Server running on stdio");
```

---

## PHASE 6 — Configuration Claude Desktop / Cowork

### Fichier `claude_desktop_config.json` à créer

Chemin Mac : `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "crisp": {
      "command": "node",
      "args": ["/CHEMIN/ABSOLU/crisp-mcp-server/dist/index.js"],
      "env": {
        "CRISP_IDENTIFIER": "votre_plugin_id",
        "CRISP_KEY": "votre_plugin_secret",
        "CRISP_WEBSITE_ID": "votre_website_id"
      }
    }
  }
}
```

### Obtenir les credentials Crisp

1. Aller sur [marketplace.crisp.chat](https://marketplace.crisp.chat)
2. Créer une nouvelle application ("Plugin")
3. Récupérer `Plugin ID` → `CRISP_IDENTIFIER`
4. Récupérer `Plugin Secret Key` → `CRISP_KEY`
5. Ton `Website ID` est visible dans Settings → Website Settings → URL

---

## Ordre d'exécution recommandé pour Claude Code

```
1. Créer la structure de fichiers (Phase 1)
2. Implémenter crisp-client.ts (Phase 2)
3. Implémenter tools/search.ts avec search_conversations (Phase 3)
4. Implémenter tools/analytics.ts avec get_analytics (Phase 4)
5. Implémenter src/index.ts (Phase 5)
6. npm run build && tester avec: echo '{"method":"tools/list"}' | node dist/index.js
7. Configurer claude_desktop_config.json (Phase 6)
8. Ajouter les outils restants (get_conversation, list_conversations, get_operator_stats)
```

## Tests de validation

Après chaque phase, valider avec :

```bash
# Test 1 : Le serveur démarre sans erreur
node dist/index.js

# Test 2 : Liste des outils (via MCP inspector)
npx @modelcontextprotocol/inspector node dist/index.js

# Test 3 : Appel direct search
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_conversations","arguments":{"query":"bug","page":1}}}' | node dist/index.js
```
