// @vitest-environment jsdom

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
});
