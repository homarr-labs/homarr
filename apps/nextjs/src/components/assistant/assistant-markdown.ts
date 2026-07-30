const protectedMarkdownPattern = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`+[^`\n]*`+/gu;
const inlineStrongListMarker = / - (?=\*\*[^*\n]{1,80}\*\*\s+(?:[—–:-]\s+)?)/gu;
const trailingQuestion = /\s+((?:Are|Can|Could|Do|Does|How|Is|What|When|Where|Which|Why|Would)\b[^?\n]*\?)$/u;

const normalizeProse = (text: string) => {
  const withLineBreaks = text.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n");

  return withLineBreaks
    .split("\n")
    .map((line) => {
      const markers = [...line.matchAll(inlineStrongListMarker)];
      if (markers.length < 2) return line;

      let markerIndex = 0;
      return line
        .replaceAll(inlineStrongListMarker, () => (markerIndex++ === 0 ? "\n\n- " : "\n- "))
        .replace(trailingQuestion, "\n\n$1");
    })
    .join("\n");
};

/**
 * Makes common streamed model Markdown readable without changing code samples.
 *
 * Models occasionally emit escaped line breaks or an entire bold-label list on
 * one line. The assistant-ui renderer receives this function through its
 * streaming-safe `preprocess` hook, before Markdown is parsed.
 */
export const normalizeAssistantMarkdown = (text: string) => {
  let offset = 0;
  let normalized = "";

  for (const match of text.matchAll(protectedMarkdownPattern)) {
    const index = match.index;
    normalized += normalizeProse(text.slice(offset, index));
    normalized += match[0];
    offset = index + match[0].length;
  }

  return normalized + normalizeProse(text.slice(offset));
};
