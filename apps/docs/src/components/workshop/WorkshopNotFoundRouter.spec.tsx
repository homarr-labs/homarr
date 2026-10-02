// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

import { WorkshopNotFoundRouter } from "./WorkshopNotFoundRouter";

vi.mock("next/navigation", () => ({ usePathname: () => "/404" }));
vi.mock("./DetailPage", () => ({
  default: ({ submissionId }: { submissionId: string }) => <div data-submission-id={submissionId} />,
}));

it.each([
  ["/workshop/abc123", "abc123"],
  ["/workshop/abc123/", "abc123"],
  ["/workshop/admin", null],
  ["/workshop/admin/", null],
  ["/docs/missing", null],
  ["/workshop/abc123/extra", null],
])("routes the static 404 shell using the requested URL %s", async (pathname, expectedId) => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.history.replaceState(null, "", pathname);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<WorkshopNotFoundRouter configuredWorkshopUrl="" />));
    expect(host.querySelector("[data-submission-id]")?.getAttribute("data-submission-id") ?? null).toBe(expectedId);
    expect(host.textContent?.includes("Page not found")).toBe(expectedId === null);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    window.history.replaceState(null, "", "/");
  }
});
