export const getSafeAssistantHttpUrl = (source: unknown) => {
  if (typeof source !== "string" || !source) return null;

  try {
    const url = new URL(source);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
};
