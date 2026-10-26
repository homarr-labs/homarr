import type { NextRequest } from "next/server";

export const isBoardDocumentRequest = (request: NextRequest) => {
  if (request.nextUrl.search) return false;
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (!request.headers.get("accept")?.includes("text/html")) return false;
  for (const header of ["next-url", "next-request-id", "next-html-request-id", "next-action", "purpose"]) {
    if (request.headers.has(header)) return false;
  }
  if (request.headers.get("sec-purpose")?.includes("prefetch")) return false;
  const destination = request.headers.get("sec-fetch-dest");
  return destination === null || destination === "document";
};
