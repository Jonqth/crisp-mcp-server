#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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

// Start stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Crisp MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
