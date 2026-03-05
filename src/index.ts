#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import {
  searchConversationsInputSchema,
  getConversationInputSchema,
  listConversationsInputSchema,
  handleSearchConversations,
  handleGetConversation,
  handleListConversations,
} from "./tools/search.js";

import {
  getAnalyticsInputSchema,
  getOperatorStatsInputSchema,
  handleGetAnalytics,
  handleGetOperatorStats,
} from "./tools/analytics.js";

function createServer(): McpServer {
  const server = new McpServer(
    { name: "crisp-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // Search tools
  server.registerTool(
    "search_conversations",
    {
      description:
        "Search Crisp conversations by text or segment. Returns matching conversations with contact info and status.",
      inputSchema: searchConversationsInputSchema,
    },
    async (args) => handleSearchConversations(args)
  );

  server.registerTool(
    "get_conversation",
    {
      description:
        "Get the details of a specific conversation and its messages by session ID.",
      inputSchema: getConversationInputSchema,
    },
    async (args) => handleGetConversation(args)
  );

  server.registerTool(
    "list_conversations",
    {
      description:
        "List Crisp conversations with optional status filter (pending, unresolved, resolved).",
      inputSchema: listConversationsInputSchema,
    },
    async (args) => handleListConversations(args)
  );

  // Analytics tools
  server.registerTool(
    "get_analytics",
    {
      description:
        "Get Crisp analytics and metrics for a date range: total conversations, response time, resolution time, CSAT score.",
      inputSchema: getAnalyticsInputSchema,
    },
    async (args) => handleGetAnalytics(args)
  );

  server.registerTool(
    "get_operator_stats",
    {
      description:
        "Get operator performance stats for a given date range.",
      inputSchema: getOperatorStatsInputSchema,
    },
    async (args) => handleGetOperatorStats(args)
  );

  return server;
}

// --- HTTP mode (Railway / remote) ---

function startHttpServer() {
  const app = express();
  app.use(express.json());

  const API_TOKEN = process.env.MCP_API_TOKEN;
  if (!API_TOKEN) {
    console.error(
      "WARNING: MCP_API_TOKEN is not set. The server is exposed without authentication!"
    );
  }

  // Bearer token auth middleware for /mcp routes
  function authMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    if (!API_TOKEN) return next();
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${API_TOKEN}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  }

  // Session storage
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // Health check (no auth needed)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "crisp-mcp-server" });
  });

  // POST /mcp — handle MCP requests
  app.post("/mcp", authMiddleware, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // Existing session
    if (sessionId && transports[sessionId]) {
      await transports[sessionId].handleRequest(req, res, req.body);
      return;
    }

    // New session (must be initialize request)
    if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId];
      };

      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({ error: "Invalid request: missing session or not an initialize request" });
  });

  // GET /mcp — SSE streams
  app.get("/mcp", authMiddleware, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).json({ error: "Invalid or missing session" });
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  // DELETE /mcp — session termination
  app.delete("/mcp", authMiddleware, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;
    if (sessionId && transports[sessionId]) {
      await transports[sessionId].handleRequest(req, res);
    } else {
      res.status(400).json({ error: "Invalid or missing session" });
    }
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, "0.0.0.0", () => {
    console.error(`Crisp MCP Server running on http://0.0.0.0:${port}/mcp`);
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
