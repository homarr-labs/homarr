export type CustomWidgetHttpUrlIssue = "invalid" | "protocol" | "credentials";

export function getCustomWidgetHttpUrlIssue(value: string): CustomWidgetHttpUrlIssue | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "invalid";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "protocol";
  if (url.username || url.password) return "credentials";
  return null;
}
