import { describe, expect, test } from "vitest";

import { getSafeAssistantHttpUrl } from "./assistant-url";

describe("getSafeAssistantHttpUrl", () => {
  test("allows ordinary HTTP and HTTPS source URLs", () => {
    expect(getSafeAssistantHttpUrl("https://example.com/source?q=homarr")).toBe("https://example.com/source?q=homarr");
    expect(getSafeAssistantHttpUrl("http://example.com/source")).toBe("http://example.com/source");
  });

  test("rejects unsafe protocols, relative URLs, and embedded credentials", () => {
    expect(getSafeAssistantHttpUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeAssistantHttpUrl("data:text/html;base64,PGgxPkJhZDwvaDE+")).toBeNull();
    expect(getSafeAssistantHttpUrl("/manage/custom-widgets")).toBeNull();
    expect(getSafeAssistantHttpUrl("https://user:secret@example.com/source")).toBeNull();
  });
});
