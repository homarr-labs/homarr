export function serializeMcpToolResult(result: unknown): string {
  return JSON.stringify(result) ?? "null";
}
