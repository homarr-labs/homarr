import { promisify } from "node:util";
import { gzip, gunzip } from "node:zlib";

export const maxDocumentBytes = 4 * 1024 * 1024;
const compressAsync = promisify(gzip);
const decompressAsync = promisify(gunzip);

export interface CompressedDocument {
  encoding: "gzip-base64";
  body: string;
}

// A captured response has already finished streaming. Remove the reveal delay
// from Next 16's React bootstrap, without rewriting widget text or RSC payloads.
export const revealCapturedDocument = (html: string) =>
  html.replace(
    /<!--[\s\S]*?-->|<(style|textarea|title)\b[^>]*>[\s\S]*?<\/\1\b[^>]*>|(<script\b[^>]*>)([\s\S]*?)(<\/script\b[^>]*>)/gi,
    (script: string, _rawText: string | undefined, open: string | undefined, body: string, close: string) => {
      if (!open) return script;
      if (body === "requestAnimationFrame(function(){$RT=performance.now()});") return open + close;
      // React may prepend its stylesheet helper to the first reveal.
      if (body.startsWith("$RB=[];$RV=function(a){") || body.startsWith("$RX=function(")) {
        return open + body.replace("$RB=[];$RV=function(a){$RT=performance.now();", "$RB=[];$RV=function(a){") + close;
      }
      return script;
    },
  );

export const compressDocumentAsync = async (html: string): Promise<CompressedDocument> => {
  if (Buffer.byteLength(html) > maxDocumentBytes) throw new Error("Prepared Board exceeds its size budget");
  const compressed = await compressAsync(html);
  return { encoding: "gzip-base64", body: compressed.toString("base64") };
};

export const decompressDocumentAsync = async (document: CompressedDocument) => {
  if (document.encoding !== "gzip-base64" || document.body.length > maxDocumentBytes * 2)
    throw new Error("Invalid prepared Board document");
  return (await decompressAsync(Buffer.from(document.body, "base64"), { maxOutputLength: maxDocumentBytes })).toString(
    "utf8",
  );
};
