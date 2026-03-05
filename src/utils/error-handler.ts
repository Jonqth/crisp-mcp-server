export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export async function safeTool<T>(
  fn: () => Promise<T>
): Promise<T | { content: [{ type: "text"; text: string }]; isError: true }> {
  try {
    return await fn();
  } catch (error) {
    console.error("Tool error:", error);
    return {
      content: [{ type: "text", text: `Error: ${formatError(error)}` }],
      isError: true,
    };
  }
}
