import { z } from "zod";
import CrispClient, { WEBSITE_ID } from "../crisp-client.js";
import { formatTimeAgo, stateLabel, truncate } from "../utils/formatters.js";

// --- Tool definitions ---

export const searchConversationsInputSchema = z.object({
  query: z.string().describe("Text to search in conversations"),
  page: z.number().optional().default(1).describe("Page number (default: 1)"),
  search_type: z
    .enum(["text", "segment"])
    .optional()
    .default("text")
    .describe("Search type: text or segment"),
});

export const getConversationInputSchema = z.object({
  session_id: z.string().describe("Conversation session ID"),
  messages_limit: z
    .number()
    .optional()
    .default(20)
    .describe("Max number of messages to return (default: 20)"),
});

export const listConversationsInputSchema = z.object({
  status: z
    .enum(["pending", "unresolved", "resolved"])
    .optional()
    .describe("Filter by conversation state"),
  page: z.number().optional().default(1).describe("Page number (default: 1)"),
});

// --- Handlers ---

export async function handleSearchConversations(
  args: z.infer<typeof searchConversationsInputSchema>
) {
  const { query, page, search_type } = args;

  const conversations = await CrispClient.website.listConversations(
    WEBSITE_ID!,
    page,
    {
      search_type,
      search_query: query,
    }
  );

  if (!conversations || conversations.length === 0) {
    return {
      content: [
        { type: "text" as const, text: `No conversations found for "${query}".` },
      ],
    };
  }

  const lines = conversations.map((c: any, i: number) => {
    const email = c.meta?.email || "unknown";
    const lastMsg = c.last_message
      ? truncate(c.last_message)
      : "(no message)";
    const time = c.updated_at ? formatTimeAgo(c.updated_at) : "unknown";
    const state = stateLabel(c.state);
    return `${i + 1}. [ID: ${c.session_id}] ${email} — "${lastMsg}" (${time}, status: ${state})`;
  });

  const text = `Found ${conversations.length} conversations for "${query}":\n\n${lines.join("\n")}`;

  return { content: [{ type: "text" as const, text }] };
}

export async function handleGetConversation(
  args: z.infer<typeof getConversationInputSchema>
) {
  const { session_id, messages_limit } = args;

  const conversation = await CrispClient.website.getConversation(
    WEBSITE_ID!,
    session_id
  );

  const messages = await CrispClient.website.getMessagesInConversation(
    WEBSITE_ID!,
    session_id
  );

  const email = conversation.meta?.email || "unknown";
  const state = stateLabel(conversation.state);
  const subject = conversation.meta?.subject || "(no subject)";

  const limitedMessages = messages.slice(-messages_limit);

  const messageLines = limitedMessages.map((m: any) => {
    const author =
      m.from === "operator"
        ? m.user?.nickname || "Operator"
        : email;
    const time = m.timestamp
      ? new Date(m.timestamp).toISOString()
      : "unknown";
    const content =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    return `[${time}] ${author}: ${content}`;
  });

  const text = [
    `Conversation ${session_id}`,
    `Contact: ${email} | State: ${state} | Subject: ${subject}`,
    `---`,
    ...messageLines,
  ].join("\n");

  return { content: [{ type: "text" as const, text }] };
}

export async function handleListConversations(
  args: z.infer<typeof listConversationsInputSchema>
) {
  const { status, page } = args;

  const options: Record<string, unknown> = {};
  if (status) {
    if (status === "pending") options.filter_not_resolved = 1;
    if (status === "resolved") options.filter_resolved = 1;
    if (status === "unresolved") options.filter_not_resolved = 1;
  }

  const conversations = await CrispClient.website.listConversations(
    WEBSITE_ID!,
    page,
    options
  );

  if (!conversations || conversations.length === 0) {
    return {
      content: [
        { type: "text" as const, text: `No conversations found${status ? ` with status "${status}"` : ""}.` },
      ],
    };
  }

  const lines = conversations.map((c: any, i: number) => {
    const email = c.meta?.email || "unknown";
    const lastMsg = c.last_message
      ? truncate(c.last_message)
      : "(no message)";
    const time = c.updated_at ? formatTimeAgo(c.updated_at) : "unknown";
    const state = stateLabel(c.state);
    return `${i + 1}. [ID: ${c.session_id}] ${email} — "${lastMsg}" (${time}, status: ${state})`;
  });

  const header = status
    ? `Conversations with status "${status}" (page ${page}):`
    : `Conversations (page ${page}):`;
  const text = `${header}\n\n${lines.join("\n")}`;

  return { content: [{ type: "text" as const, text }] };
}
