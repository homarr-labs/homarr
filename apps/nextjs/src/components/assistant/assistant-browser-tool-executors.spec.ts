import { describe, expect, test, vi } from "vitest";

import { createAssistantBrowserToolExecutors, resolveAssistantInternalRoute } from "./assistant-browser-tool-executors";

describe("assistant browser tool executors", () => {
  test("normalizes same-origin routes and rejects external or protocol-relative navigation", () => {
    expect(resolveAssistantInternalRoute("/manage/apps?view=grid#new", "https://homarr.example")).toBe(
      "/manage/apps?view=grid#new",
    );
    expect(resolveAssistantInternalRoute("https://example.com", "https://homarr.example")).toBeNull();
    expect(resolveAssistantInternalRoute("//example.com/apps", "https://homarr.example")).toBeNull();
    expect(resolveAssistantInternalRoute("/\\example.com/apps", "https://homarr.example")).toBeNull();
  });

  test("executes every supported frontend action through its injected Homarr dependency", async () => {
    const navigate = vi.fn();
    const openCommandMenu = vi.fn();
    const openMediaRequestSearch = vi.fn();
    const refreshCurrentView = vi.fn().mockResolvedValue(undefined);
    const executors = createAssistantBrowserToolExecutors({
      getOrigin: () => "https://homarr.example",
      navigate,
      openCommandMenu,
      openMediaRequestSearch,
      refreshCurrentView,
    });

    await expect(executors.navigate_to_route({ path: "/manage/apps" })).resolves.toEqual({
      success: true,
      path: "/manage/apps",
    });
    await expect(executors.open_command_menu()).resolves.toEqual({ success: true });
    await expect(executors.open_media_request_search()).resolves.toEqual({ success: true });
    await expect(executors.refresh_current_view()).resolves.toEqual({ success: true });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/manage/apps");
    expect(openCommandMenu).toHaveBeenCalledOnce();
    expect(openMediaRequestSearch).toHaveBeenCalledOnce();
    expect(refreshCurrentView).toHaveBeenCalledOnce();
  });

  test("does not navigate when the assistant requests an unsafe route", async () => {
    const navigate = vi.fn();
    const executors = createAssistantBrowserToolExecutors({
      getOrigin: () => "https://homarr.example",
      navigate,
      openCommandMenu: vi.fn(),
      openMediaRequestSearch: vi.fn(),
      refreshCurrentView: vi.fn().mockResolvedValue(undefined),
    });

    await expect(executors.navigate_to_route({ path: "https://example.com" })).resolves.toEqual({
      success: false,
      error: "Only internal Homarr paths are allowed.",
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  test("reports a failed refresh without crashing the assistant run", async () => {
    const executors = createAssistantBrowserToolExecutors({
      getOrigin: () => "https://homarr.example",
      navigate: vi.fn(),
      openCommandMenu: vi.fn(),
      openMediaRequestSearch: vi.fn(),
      refreshCurrentView: vi.fn().mockRejectedValue(new Error("offline")),
    });

    await expect(executors.refresh_current_view()).resolves.toEqual({
      success: false,
      error: "The current Homarr view could not be refreshed.",
    });
  });
});
