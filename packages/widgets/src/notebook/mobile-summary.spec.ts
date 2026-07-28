import { describe, expect, test } from "vitest";

import { extractNotebookExcerpt } from "./mobile-summary";

describe("extractNotebookExcerpt", () => {
  test("returns decoded plain text from notebook HTML", () => {
    expect(extractNotebookExcerpt("<h1>Hello&nbsp;world</h1><p>Fish &amp; chips</p>")).toBe("Hello world Fish & chips");
  });

  test("removes script and style content including whitespace before closing brackets", () => {
    const content =
      '<p>Visible</p><script>alert("hidden")</script ><style>body { display: none; }</style ><p>Still visible</p>';

    expect(extractNotebookExcerpt(content)).toBe("Visible Still visible");
  });

  test("returns an empty excerpt when there is no visible content", () => {
    expect(extractNotebookExcerpt("<script>hidden()</script><style>.hidden {}</style>")).toBe("");
  });
});
