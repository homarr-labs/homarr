import { promisify } from "node:util";
import { gzip, gunzip } from "node:zlib";

export const maxDocumentBytes = 4 * 1024 * 1024;
const compressAsync = promisify(gzip);
const decompressAsync = promisify(gunzip);

export interface CompressedDocument {
  encoding: "gzip-base64";
  body: string;
}

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
