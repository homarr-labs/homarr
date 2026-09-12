import { getSafeApplicationUrl } from "@homarr/common";

/** Offer an explicit prefix; preserve the owner's hostname, port and path text. */
export function getConnectionUrlSuggestion(value: string): string | undefined {
  const input = value.trim();
  if (!input || input.includes("://") || (input.startsWith("/") && !input.startsWith("//"))) return undefined;
  let candidate = `http://${input}`;
  if (input.startsWith("//")) candidate = `http:${input}`;
  if (!getSafeApplicationUrl(candidate)) return undefined;
  return candidate;
}
