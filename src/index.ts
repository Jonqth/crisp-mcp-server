#!/usr/bin/env node

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import {
  searchConversationsInputSchema,
  getConversationInputSchema,
  listConversationsInputSchema,
  handleSearchConversations,
  handleGetConversation,
  handleListConversations,
} from "./tools/search.js";

import { safeTool } from "./utils/error-handler.js";

function createServer(): McpServer {
  const server = new McpServer(
    { name: "crisp-mcp-server", version: "1.0.0" },
    {
      instructions: `
        This server exposes read-only tools to interact with the Crisp customer messaging platform. Use it to:
        - Search conversations by text or segment
        - Get conversation details and messages
        - List conversations filtered by status
      `,
    }
  );

  server.registerTool(
    "search_conversations",
    {
      description:
        "Search Crisp conversations by text or segment. Returns matching conversations with contact info and status.",
      inputSchema: searchConversationsInputSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) => safeTool(() => handleSearchConversations(args))
  );

  server.registerTool(
    "get_conversation",
    {
      description:
        "Get the details of a specific conversation and its messages by session ID.",
      inputSchema: getConversationInputSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) => safeTool(() => handleGetConversation(args))
  );

  server.registerTool(
    "list_conversations",
    {
      description:
        "List Crisp conversations with optional status filter (pending, unresolved, resolved).",
      inputSchema: listConversationsInputSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) => safeTool(() => handleListConversations(args))
  );

  return server;
}

// --- HTTP mode (Railway / Crisp integration) ---

function startHttpServer() {
  const app = express();
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.send(
      "Crisp MCP Server is running. Use the /mcp endpoint to interact with this MCP server."
    );
  });

  app.get("/health", (_req, res) => {
    res.status(200).send("OK");
  });

  app.post("/mcp", (req, res) => {
    const server = createServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
    });

    server
      .connect(transport)
      .then(() => transport.handleRequest(req, res, req.body))
      .catch((error: unknown) => {
        console.error("MCP request error:", error);

        if (!res.headersSent) {
          res.status(500).json({ error: "MCP request failed" });
        }
      });
  });

  const port = Number.parseInt(process.env.PORT ?? "3000", 10);

  app.listen(port, () => {
    console.log(`Crisp MCP Server running on http://localhost:${port}/mcp`);
  });
}

// --- Stdio mode (local / Claude Desktop) ---

async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Crisp MCP Server running on stdio");
}

// --- Entry point ---

const mode = process.env.MCP_TRANSPORT || "stdio";

if (mode === "http") {
  startHttpServer();
} else {
  startStdioServer().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
