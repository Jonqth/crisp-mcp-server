import { z } from "zod";
import CrispClient, { WEBSITE_ID } from "../crisp-client.js";
import { formatDuration } from "../utils/formatters.js";

// --- Tool definitions ---

export const getAnalyticsInputSchema = z.object({
  date_from: z
    .string()
    .describe("Start date in ISO 8601 format (e.g. 2026-02-01)"),
  date_to: z
    .string()
    .describe("End date in ISO 8601 format (e.g. 2026-03-01)"),
  metrics: z
    .array(
      z.enum([
        "conversations_total",
        "response_time",
        "resolution_time",
        "csat_score",
      ])
    )
    .optional()
    .describe("Metrics to return (all if not specified)"),
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
  const { date_from, date_to, metrics } = args;

  const analytics = await CrispClient.website.generateAnalytics(WEBSITE_ID!, {
    date_from: Math.floor(new Date(date_from).getTime() / 1000),
    date_to: Math.floor(new Date(date_to).getTime() / 1000),
    metrics: metrics || [
      "conversations_total",
      "response_time",
      "resolution_time",
    ],
  });

  const lines: string[] = [
    `Crisp metrics from ${date_from} to ${date_to}:`,
    "",
  ];

  if (analytics.conversations_total !== undefined) {
    lines.push(`Total conversations: ${analytics.conversations_total}`);
  }
  if (analytics.response_time !== undefined) {
    lines.push(`Avg response time: ${formatDuration(analytics.response_time)}`);
  }
  if (analytics.resolution_time !== undefined) {
    lines.push(
      `Avg resolution time: ${formatDuration(analytics.resolution_time)}`
    );
  }
  if (analytics.csat_score !== undefined) {
    lines.push(`CSAT score: ${analytics.csat_score}`);
  }

  // Include any other returned metrics
  for (const [key, value] of Object.entries(analytics)) {
    if (
      ![
        "conversations_total",
        "response_time",
        "resolution_time",
        "csat_score",
      ].includes(key)
    ) {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }

  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
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
