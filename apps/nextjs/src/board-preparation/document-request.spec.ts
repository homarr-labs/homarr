import { expect, test } from "vitest";
import { NextRequest } from "next/server";

import { isBoardDocumentRequest } from "./document-request";

const request = (url: string, headers: Record<string, string> = {}, method = "GET") =>
  new NextRequest(url, { method, headers: { accept: "text/html", ...headers } });

test("only ordinary document loads qualify for prepared HTML", () => {
  expect(isBoardDocumentRequest(request("https://homarr.test/boards/default"))).toBe(true);
  expect(isBoardDocumentRequest(request("https://homarr.test/boards/default", {}, "HEAD"))).toBe(true);
  expect(isBoardDocumentRequest(request("https://homarr.test/boards/default?_rsc=1"))).toBe(false);
  expect(isBoardDocumentRequest(request("https://homarr.test/boards/default", { "next-url": "/" }))).toBe(false);
  expect(isBoardDocumentRequest(request("https://homarr.test/boards/default", { "sec-purpose": "prefetch" }))).toBe(
    false,
  );
  expect(isBoardDocumentRequest(request("https://homarr.test/boards/default", {}, "POST"))).toBe(false);
});
