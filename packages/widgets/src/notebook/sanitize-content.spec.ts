import { expect, test } from "vitest";

import { sanitizeNotebookHtml } from "./sanitize-content";

test("preserves saved table column widths without allowing executable content or arbitrary CSS", () => {
  const html = sanitizeNotebookHtml(
    '<table style="min-width: 400px; position: fixed"><colgroup><col style="width: 100px"><col style="width: 300px"></colgroup><tbody><tr><td><p>Narrow</p></td><td><p>Wide</p><img src="x" onerror="alert(1)"></td></tr></tbody></table>',
  );
  const holder = document.createElement("div");
  holder.innerHTML = html;
  expect(holder.querySelector("table")?.style.minWidth).toBe("400px");
  expect([...holder.querySelectorAll("col")].map((col) => col.style.width)).toEqual(["100px", "300px"]);
  expect(holder.querySelector("table")?.style.position).toBe("");
  expect(holder.querySelector("img")?.hasAttribute("onerror")).toBe(false);
});
