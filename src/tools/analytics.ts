import { z } from "zod";
import CrispClient, { WEBSITE_ID } from "../crisp-client.js";

// --- Tool definitions ---

const metricEnum = z.enum([
  "conversation",
  "conversation_assigned",
  "conversation_shortcut",
  "conversation_segment",
  "helpdesk_read",
  "helpdesk_search",
  "visitor_visit",
  "visitor_trigger",
  "campaign_activity",
  "campaign_sent",
  "people_created",
  "status_downtime",
]);

const typeEnum = z.enum([
  "total",
  "unique",
  "response_time",
  "resolution_time",
  "handle_time",
  "messages",
  "visitor_messages",
  "operator_messages",
  "rating",
]);

export const getAnalyticsInputSchema = z.object({
  metric: metricEnum.describe(
    "Analytics metric to query (e.g. conversation, visitor_visit, helpdesk_read)"
  ),
  type: typeEnum.describe(
    "Analytics type: total, unique, response_time, resolution_time, handle_time, messages, rating, etc."
  ),
  date_from: z
    .string()
    .describe("Start date in ISO 8601 format (e.g. 2026-01-01T00:00:00Z)"),
  date_to: z
    .string()
    .describe("End date in ISO 8601 format (e.g. 2026-02-01T00:00:00Z)"),
  date_split: z
    .enum(["hour", "day", "week", "month"])
    .optional()
    .default("day")
    .describe("Date split granularity (default: day)"),
  timezone: z
    .string()
    .optional()
    .default("Europe/Paris")
    .describe("Timezone (default: Europe/Paris)"),
});

export const getOperatorStatsInputSchema = z.object({
  date_from: z
    .string()
    .describe("Start date in ISO 8601 format (e.g. 2026-02-01)"),
  date_to: z
    .string()
    .describe("End date in ISO 8601 format (e.g. 2026-03-01)"),
});

// --- Handlers ---

export async function handleGetAnalytics(
  args: z.infer<typeof getAnalyticsInputSchema>
) {
  const { metric, type, date_from, date_to, date_split, timezone } = args;

  const analytics = await CrispClient.website.generateAnalytics(WEBSITE_ID!, {
    metric,
    type,
    date: {
      from: date_from,
      to: date_to,
      split: date_split,
      timezone,
    },
  });

  const text = [
    `Analytics: ${metric} / ${type}`,
    `Period: ${date_from} to ${date_to} (split by ${date_split})`,
    ``,
    JSON.stringify(analytics, null, 2),
  ].join("\n");

  return { content: [{ type: "text" as const, text }] };
}

export async function handleGetOperatorStats(
  args: z.infer<typeof getOperatorStatsInputSchema>
) {
  const { date_from, date_to } = args;

  const operators = await CrispClient.website.listWebsiteOperators(
    WEBSITE_ID!
  );

  const lines: string[] = [
    `Operator stats from ${date_from} to ${date_to}:`,
    "",
  ];

  if (!operators || operators.length === 0) {
    lines.push("No operators found.");
  } else {
    for (const op of operators) {
      const details = op.details;
      const name =
        details?.firstName && details?.lastName
          ? `${details.firstName} ${details.lastName}`
          : details?.firstName || "Unknown";
      const role = details?.role || "unknown";
      lines.push(`- ${name} (${role})`);
    }
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
