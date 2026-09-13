export function formatCode(value: string, language: "jsx" | "tsx" | "json" | "css") {
  if (language === "json") {
    try {
      const parsed: unknown = JSON.parse(value);
      return `${JSON.stringify(parsed, null, 2)}\n`;
    } catch {
      return value;
    }
  }
  return value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}
