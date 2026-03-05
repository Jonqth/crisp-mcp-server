# Crisp MCP Server

MCP (Model Context Protocol) server for [Crisp.chat](https://crisp.chat) — allows Claude and other LLMs to search conversations, retrieve messages, and access analytics from your Crisp workspace.

## Tools

| Tool | Description |
|---|---|
| `search_conversations` | Search conversations by text or segment |
| `get_conversation` | Get conversation details and messages by session ID |
| `list_conversations` | List conversations with optional status filter |
| `get_analytics` | Get metrics for a date range (conversations, response time, CSAT...) |
| `get_operator_stats` | Get operator performance stats |

## Setup

### 1. Crisp credentials

Two authentication modes are supported:

#### Option A: Plugin tier (recommended for integrations)

1. Go to [marketplace.crisp.chat](https://marketplace.crisp.chat) and sign in (or create a Marketplace account — separate from your main Crisp account)
2. Click **New Plugin** → choose **Private**
3. Name your plugin (e.g. "MCP Server") and click **Create**
4. Go to the **Tokens** tab → scroll to **Production** → click **Ask a production token**
5. Select the required scopes:
   - `website:conversation:sessions` (list/search conversations)
   - `website:conversation:messages` (read messages)
   - `website:conversation:participants` (read participants)
   - `website:analytics` (analytics & metrics)
   - `website:operator` (operator stats)
6. Explain your use case and submit — approval usually takes a few minutes
7. Once approved, copy your **Production token keypair**:
   - **Identifier** → `CRISP_IDENTIFIER`
   - **Key** → `CRISP_KEY`
8. Go to the **Settings** tab → copy the **Private install link** and open it to install the plugin on your website
9. Find your **Website ID**: in [app.crisp.chat](https://app.crisp.chat) go to **Settings → Website Settings** → copy the ID from the URL → `CRISP_WEBSITE_ID`
10. Set `CRISP_TIER=plugin` (default)

> **Keep your token keypair private.** If compromised, roll it immediately from your Marketplace dashboard.

#### Option B: User tier (full access)

Use your operator credentials for full access to all API routes including analytics. No scope configuration needed.

1. Sign in to [app.crisp.chat](https://app.crisp.chat)
2. Go to **Settings → Account Settings → API Token** and generate a token
3. Configure:
   - **Email** → `CRISP_IDENTIFIER`
   - **User token** → `CRISP_KEY`
   - Set `CRISP_TIER=user`
4. Find your **Website ID**: go to **Settings → Website Settings** → copy the ID from the URL → `CRISP_WEBSITE_ID`

> User tier gives access to all routes but is less suited for automated/production use.

### 2. Deploy on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.app)

Set the following environment variables:

| Variable | Value |
|---|---|
| `MCP_TRANSPORT` | `http` |
| `CRISP_TIER` | `plugin` or `user` |
| `CRISP_IDENTIFIER` | Plugin ID or email |
| `CRISP_KEY` | Plugin Secret or user token |
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
        "CRISP_TIER": "plugin",
        "CRISP_IDENTIFIER": "your_plugin_id",
        "CRISP_KEY": "your_plugin_secret",
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
