import { getSafeAssistantHttpUrl } from "./assistant-url";

export const getSafeAssistantMarkdownImageSource = (source: string | Blob | undefined) => {
  if (typeof source !== "string" || !source) return null;
  if (source.startsWith("/") && !source.startsWith("//")) return source;

  return getSafeAssistantHttpUrl(source);
};

const safeAttachmentDataUrl =
  /^data:image\/(?:gif|jpeg|png|webp);base64,(?:[a-z\d+/]{4})*(?:[a-z\d+/]{2}==|[a-z\d+/]{3}=)?$/iu;

export const getSafeAssistantAttachmentImageSource = (source: unknown, currentOrigin?: string) => {
  if (typeof source !== "string" || !source) return null;
  if (safeAttachmentDataUrl.test(source)) return source;
  if (source.startsWith("/") && !source.startsWith("//")) return source;
  if (!currentOrigin) return null;

  try {
    const sourceUrl = new URL(source);
    const originUrl = new URL(currentOrigin);
    if (
      sourceUrl.origin !== originUrl.origin ||
      (sourceUrl.protocol !== "http:" && sourceUrl.protocol !== "https:") ||
      sourceUrl.username ||
      sourceUrl.password
    ) {
      return null;
    }
    return sourceUrl.toString();
  } catch {
    return null;
  }
};
