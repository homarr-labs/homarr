import { describe, expect, it } from "vitest";

import { purify, sanitizeSvg, svgSanitizeOptions } from "./svg-purify";

describe("SVG sanitization", () => {
  it("strips script tags from SVG", () => {
    const dirty = '<svg><script>alert("xss")</script><circle r="10"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).toContain("circle");
  });

  it("strips onload event handler", () => {
    const dirty = '<svg onload="alert(1)"><rect width="100" height="100"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("onload");
  });

  it("strips data URI in use href", () => {
    const dirty = '<svg><use href="data:text/html,<script>alert(1)</script>"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("data:");
  });

  it("strips foreignObject", () => {
    const dirty =
      '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("foreignObject");
  });

  it("preserves safe SVG content", () => {
    const safe = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
    const clean = sanitizeSvg(safe);
    expect(clean).toContain("circle");
    expect(clean).toContain('fill="red"');
  });

  it("uses the same DOMPurify options as production", () => {
    const dirty = '<svg><script>alert("xss")</script></svg>';
    const wrapped = `<html><body>${dirty}</body></html>`;
    expect(sanitizeSvg(dirty)).toBe(purify.sanitize(wrapped, svgSanitizeOptions));
  });

  it("strips javascript: protocol in href", () => {
    const dirty = '<svg><a href="javascript:alert(1)"><text>click</text></a></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("javascript:");
  });

  it("strips xlink:href with javascript:", () => {
    const dirty = '<svg><a xlink:href="javascript:alert(1)"><text>click</text></a></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("javascript:");
  });

  it("strips style with url() import", () => {
    const dirty =
      '<svg><style>@import url("https://evil.com/steal.css");</style><rect width="100" height="100"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("@import");
  });

  it("strips animate with onbegin handler", () => {
    const dirty = '<svg><animate onbegin="alert(1)"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain("onbegin");
  });
});
