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

Create a plugin on [marketplace.crisp.chat](https://marketplace.crisp.chat) to get your credentials:

- **Plugin ID** → `CRISP_IDENTIFIER`
- **Plugin Secret Key** → `CRISP_KEY`
- **Website ID** (Settings → Website Settings) → `CRISP_WEBSITE_ID`

### 2. Deploy on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.app)

Set the following environment variables:

| Variable | Value |
|---|---|
| `MCP_TRANSPORT` | `http` |
| `CRISP_IDENTIFIER` | Your Plugin ID |
| `CRISP_KEY` | Your Plugin Secret Key |
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
