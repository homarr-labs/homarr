import { afterEach, describe, expect, test } from "vitest";

import { getRuntimeWorkshopApiUrl } from "./runtime-config";

describe("Workshop runtime configuration", () => {
  afterEach(() => {
    delete window.homarrRuntimeConfig;
  });

  test("prefers the URL supplied when the container starts", () => {
    window.homarrRuntimeConfig = { workshopApiUrl: "https://v2.preview.homarr.dev" };

    expect(getRuntimeWorkshopApiUrl("https://homarr.dev")).toBe("https://v2.preview.homarr.dev");
  });

  test("keeps the build-time URL as a fallback", () => {
    expect(getRuntimeWorkshopApiUrl("https://homarr.dev")).toBe("https://homarr.dev");
  });
});
