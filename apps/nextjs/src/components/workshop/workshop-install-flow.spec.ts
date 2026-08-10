// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { getWorkshopWebUrl } from "./workshop-client";

describe("Workshop widget install flow", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("links to the runtime-configured Workshop entry", () => {
    document.head.innerHTML = '<meta name="homarr-workshop-web-url" content="https://preview.example/workshop/">';

    expect(getWorkshopWebUrl()).toBe("https://preview.example/workshop");
    expect(getWorkshopWebUrl("widget/id")).toBe("https://preview.example/workshop/widget%2Fid");
  });

  it("uses one registered modal stack for browsing, details, reports, and confirmation", () => {
    const installButton = readFileSync(
      `${process.cwd()}/apps/nextjs/src/components/workshop/workshop-install-button.tsx`,
      "utf8",
    );
    const browser = readFileSync(`${process.cwd()}/apps/nextjs/src/components/workshop/workshop-browser.tsx`, "utf8");

    expect(installButton).toContain('useModalsStack(["workshop", "details", "report", "review"])');
    expect(installButton).toContain("<Modal.Stack>");
    expect(installButton).toContain('height: "min(85dvh, 900px)"');
    expect(installButton).not.toContain("getDefaultZIndex");
    expect(browser).toContain("ReadOnlyCustomWidgetCode");
    expect(browser).not.toContain("{item.widgetSchema}");
  });
});
