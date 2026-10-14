export {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const origin = process.env.NITRO_FIXTURE_ORIGIN ?? "http://127.0.0.1:3100";
const url = new URL("/api/boards/public", origin);

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(2500), redirect: "error" });
  if (!response.ok) throw new Error(`Fixture read returned ${response.status}`);
  const body: unknown = await response.json();
  const board = body;
  if (
    !isRecord(board) ||
    board.id !== "public" ||
    board.visibility !== "public" ||
    typeof board.revision !== "number" ||
    !Number.isSafeInteger(board.revision) ||
    board.revision < 1 ||
    !isRecord(board.content) ||
    typeof board.content.label !== "string" ||
    !board.content.label.trim()
  )
    throw new Error("Fixture database read did not return a committed public board");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Fixture database read failed");
  process.exitCode = 1;
}
