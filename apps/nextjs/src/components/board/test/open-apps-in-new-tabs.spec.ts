import { describe, expect, test, vi } from "vitest";

import { openAppsInNewTabs } from "../open-apps-in-new-tabs";

describe("openAppsInNewTabs", () => {
  test("opens tabs synchronously and navigates them to fetched URLs", async () => {
    const openedWindowOne = { opener: null, location: { href: "" }, close: vi.fn() } as unknown as Window;
    const openedWindowTwo = { opener: null, location: { href: "" }, close: vi.fn() } as unknown as Window;
    const openedWindowThree = { opener: null, location: { href: "" }, close: vi.fn() } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValueOnce(openedWindowOne).mockReturnValueOnce(openedWindowTwo).mockReturnValueOnce(openedWindowThree);
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
    expect(open).toHaveBeenCalledTimes(3);
    expect(open).toHaveBeenNthCalledWith(1, "", "_blank", "noopener,noreferrer");
    expect(open).toHaveBeenNthCalledWith(2, "", "_blank", "noopener,noreferrer");
    expect(open).toHaveBeenNthCalledWith(3, "", "_blank", "noopener,noreferrer");
    expect(openedWindowOne.location.href).toBe("https://example.com/one");
    expect(openedWindowTwo.location.href).toBe("https://example.com/two");
    expect(openedWindowThree.close).toHaveBeenCalledTimes(1);
    expect(openConfirmModal).not.toHaveBeenCalled();
  });

  test("de-duplicates app IDs before fetching", async () => {
    const openedWindow = { opener: null, location: { href: "" }, close: vi.fn() } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(openedWindow);
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
