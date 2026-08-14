// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { getWorkshopAssistantProviderUrl, getWorkshopWebUrl } from "./workshop-client";

describe("Workshop widget install flow", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("links to the runtime-configured Workshop entry", () => {
    document.head.innerHTML = '<meta name="homarr-workshop-web-url" content="https://preview.example/workshop/">';

    expect(getWorkshopWebUrl()).toBe("https://preview.example/workshop");
    expect(getWorkshopWebUrl("widget/id")).toBe("https://preview.example/workshop/widget%2Fid");
  });

  it("uses the runtime Workshop web URL independently from the API origin", () => {
    document.head.innerHTML = [
      '<meta name="homarr-workshop-api-url" content="https://api.example.com/">',
      '<meta name="homarr-workshop-web-url" content="https://community.example.com/workshop">',
    ].join("");

    expect(getWorkshopWebUrl()).toBe("https://community.example.com/workshop");
  });

  it("derives the Homarr provider endpoint from the runtime Workshop API", () => {
    document.head.innerHTML = '<meta name="homarr-workshop-api-url" content="https://api.preview.example/">';

    expect(getWorkshopAssistantProviderUrl()).toBe("https://api.preview.example/api/ai/v1");
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

  it("uses a two-step modal stack for Custom CSS", () => {
    const cssButton = readFileSync(
      `${process.cwd()}/apps/nextjs/src/components/workshop/workshop-css-import-button.tsx`,
      "utf8",
    );
    const browser = readFileSync(`${process.cwd()}/apps/nextjs/src/components/workshop/workshop-browser.tsx`, "utf8");

    expect(cssButton).toContain('useModalsStack(["workshop", "details", "report"])');
    expect(cssButton).toContain("<Modal.Stack>");
    expect(cssButton).toContain('height: "min(85dvh, 900px)"');
    expect(browser).not.toContain("cssAwaitingConfirmation");
    expect(browser).toContain("useWorkshopReportSummariesQuery");
  });
});
