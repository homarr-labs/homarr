import { describe, expect, test, vi } from "vitest";

import { openAppsInNewTabs } from "../open-apps-in-new-tabs";

describe("openAppsInNewTabs", () => {
  test("opens fetched apps with URLs in new tabs with noopener", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue({ opener: null } as unknown as Window);
    const fetchAppsByIds = vi
      .fn()
      .mockResolvedValue([{ href: "https://example.com/one" }, { href: null }, { href: "https://example.com/two" }]);
    const openConfirmModal = vi.fn();

    await openAppsInNewTabs(["app-one", "app-two", "app-three"], {
      t: (key) => key,
      openConfirmModal,
      fetchAppsByIds,
    });

    expect(fetchAppsByIds).toHaveBeenCalledWith(["app-one", "app-two", "app-three"]);
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenNthCalledWith(1, "https://example.com/one", "_blank", "noopener,noreferrer");
    expect(open).toHaveBeenNthCalledWith(2, "https://example.com/two", "_blank", "noopener,noreferrer");
    expect(openConfirmModal).not.toHaveBeenCalled();
  });

  test("de-duplicates app IDs before fetching", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue({ opener: null } as unknown as Window);
    const fetchAppsByIds = vi.fn().mockResolvedValue([{ href: "https://example.com/one" }]);
    const openConfirmModal = vi.fn();

    await openAppsInNewTabs(["app-one", "app-one", "app-one"], {
      t: (key) => key,
      openConfirmModal,
      fetchAppsByIds,
    });

    expect(fetchAppsByIds).toHaveBeenCalledWith(["app-one"]);
    expect(open).toHaveBeenCalledTimes(1);
  });

  test("shows confirm modal when popup is blocked", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const fetchAppsByIds = vi.fn().mockResolvedValue([{ href: "https://example.com/one" }]);
    const openConfirmModal = vi.fn();

    await openAppsInNewTabs(["app-one"], {
      t: (key) => key,
      openConfirmModal,
      fetchAppsByIds,
    });

    expect(openConfirmModal).toHaveBeenCalledWith({
      title: "section.category.openAllInNewTabs.title",
      children: "section.category.openAllInNewTabs.text",
    });
  });
});
