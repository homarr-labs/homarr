export const getSafeAssistantMarkdownImageSource = (source: string | Blob | undefined) => {
  if (typeof source !== "string" || !source) return null;
  if (source.startsWith("/") && !source.startsWith("//")) return source;

  try {
    const url = new URL(source);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
};
