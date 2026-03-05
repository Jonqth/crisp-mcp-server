# Crisp MCP Server

MCP (Model Context Protocol) server for [Crisp.chat](https://crisp.chat) — allows Claude and other LLMs to search and read conversations from your Crisp workspace. All tools are read-only.

## Tools

| Tool | Description |
|---|---|
| `search_conversations` | Search conversations by text or segment |
| `get_conversation` | Get conversation details and messages by session ID |
| `list_conversations` | List conversations with optional status filter |

## Setup

### 1. Crisp credentials

All credentials are created via the [Crisp Marketplace](https://marketplace.crisp.chat).

#### Create a plugin and get your token

1. Go to [marketplace.crisp.chat](https://marketplace.crisp.chat) and sign in (or create a Marketplace account — this is separate from your main Crisp account)
2. Click **New Plugin** → choose **Private**
3. Name your plugin (e.g. "MCP Server") and click **Create**
4. Go to the **Tokens** tab → scroll to **Production** → click **Ask a production token**
5. Select the required scopes (read-only):
   - `website:conversation:sessions` — list and search conversations
   - `website:conversation:messages` — read messages
   - `website:conversation:participants` — read participants
6. Explain your use case (e.g. "Read-only MCP server for AI assistant") and submit — approval usually takes a few minutes
7. Once approved, copy your **Production token keypair**:
   - **Identifier** → `CRISP_IDENTIFIER`
   - **Key** → `CRISP_KEY`
8. Go to the **Settings** tab → copy the **Private install link** and open it to install the plugin on your website

> **Keep your token keypair private.** If compromised, roll it immediately from your Marketplace dashboard.
>
> If you get permission errors on certain routes, your token is missing the required scope. Create a new production token with all the scopes listed above.

#### Find your Website ID

1. Sign in to [app.crisp.chat](https://app.crisp.chat)
2. Go to **Settings → Website Settings**
3. Copy the Website ID from the URL → `CRISP_WEBSITE_ID`

### 2. Deploy on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.app)

Set the following environment variables:

| Variable | Value |
|---|---|
| `MCP_TRANSPORT` | `http` |
| `CRISP_IDENTIFIER` | Your Plugin Identifier |
| `CRISP_KEY` | Your Plugin Key |
| `CRISP_WEBSITE_ID` | Your Website ID |

Build command: `npm install && npm run build`
Start command: `npm start`

### 3. Connect to Crisp

1. Go to [app.crisp.chat](https://app.crisp.chat)
2. Navigate to **AI Agent → Automate → Integrations & MCP → External MCP servers**
3. Add your Railway URL: `https://your-app.railway.app/mcp`
4. Name it, refresh tools, enable, and save

### 4. Connect to Claude.ai

1. Go to [claude.ai](https://claude.ai) → Settings → Connectors
2. Add a custom connector
3. Enter your Railway URL: `https://your-app.railway.app/mcp`

### 5. Local usage (Claude Desktop)

No deploy needed. Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "crisp": {
      "command": "node",
      "args": ["/path/to/crisp-mcp-server/dist/index.js"],
      "env": {
        "CRISP_IDENTIFIER": "your_plugin_identifier",
        "CRISP_KEY": "your_plugin_key",
        "CRISP_WEBSITE_ID": "your_website_id"
      }
    }
  }
}
```

## Development

```bash
npm install
npm run dev     # Run with tsx (hot reload)
npm run build   # Compile TypeScript
npm start       # Run compiled version
```

## Stack

- TypeScript / Node.js
- `@modelcontextprotocol/sdk` — MCP protocol
- `crisp-api` — Crisp API client
- Express — HTTP transport
