// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { WidgetComponentProps } from "../definition";
import NotificationsWidget from "./component";

const mocks = vi.hoisted(() => {
  const queryState = {
    data: [] as unknown[],
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  };

  return {
    queryState,
    useNotificationsQuery: vi.fn(() => queryState),
    useDeleteNotificationMutation: vi.fn(() => ({ isPending: false, mutate: vi.fn() })),
    deleteNotification: vi.fn(),
    invalidateNotifications: vi.fn().mockResolvedValue(undefined),
    showErrorNotification: vi.fn(),
  };
});

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    widget: {
      notifications: {
        getNotifications: { useQuery: mocks.useNotificationsQuery },
        deleteNotification: { useMutation: mocks.useDeleteNotificationMutation },
      },
    },
    useUtils: () => ({
      client: {
        widget: {
          notifications: {
            deleteNotification: { mutate: mocks.deleteNotification },
          },
        },
      },
      widget: {
        notifications: {
          getNotifications: { invalidate: mocks.invalidateNotifications },
        },
      },
    }),
  },
}));

vi.mock("@homarr/auth/client", () => ({
  useIntegrationsWithInteractAccess: () => [{ id: "gotify" }, { id: "home-assistant" }],
}));

vi.mock("@homarr/notifications", () => ({
  showErrorNotification: mocks.showErrorNotification,
}));

vi.mock("@homarr/boards/context", () => ({
  useOptionalBoard: () => undefined,
}));

vi.mock("@homarr/common", () => ({
  useTimeAgo: () => "now",
}));

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string, values?: Record<string, string>) => {
    if (key === "deleteAllConfirmationMessage" && values) {
      return `Click again to delete ${values.count} notifications across ${values.integrations}`;
    }

    const translations: Record<string, string> = {
      deleteAllNotifications: "Delete all notifications",
      deleteAllButton: "Delete all",
      deleteAllConfirmationPrompt: "Click again",
      deleteAllFailed: "Could not delete notifications",
      deleteAllFailedMessage: "Some notifications could not be deleted. Please try again.",
      refreshFailed: "Could not refresh notifications",
      refreshFailedMessage: "The notifications could not be refreshed. Please try again.",
      "common.action.refresh": "Refresh",
      "common.action.loading": "Loading",
      "common.error": "Error",
      deleteNotification: "Delete notification",
      dismissNotification: "Dismiss notification",
    };

    return translations[key] ?? key;
  },
}));

vi.mock("@homarr/ui", () => ({
  iconSizes: { xs: {}, md: {} },
}));

vi.mock("../common/application-url", () => ({
  getSafeApplicationUrl: () => null,
  SAFE_NEW_TAB_REL: "noopener noreferrer",
}));

vi.mock("../common/query-state", () => ({
  getUsableWidgetQueryData: (query: { data: unknown }) => query.data,
}));

vi.mock("./notification-body", () => ({
  NotificationBody: ({ body }: { body: string }) => body,
}));

vi.mock("./display", () => ({
  getNotificationDisplay: () => ({ showLogos: false, showSource: false, bodyLineClamp: 2 }),
}));

const widgetProps: WidgetComponentProps<"notifications"> = {
  options: { hideLogos: false, messageFormat: "auto" },
  integrationIds: ["gotify", "home-assistant"],
  itemId: undefined,
  boardId: undefined,
  isEditMode: false,
  setOptions: () => undefined,
  width: 240,
  height: 180,
  displayMode: "compact",
};

const queryData = [
  {
    integration: { id: "gotify", name: "Gotify", kind: "gotify" },
    data: [{ id: "gotify-message", title: "First", body: "First body", time: new Date(), href: null }],
  },
  {
    integration: { id: "home-assistant", name: "Home Assistant", kind: "homeAssistant" },
    data: [{ id: "ha-message", title: "Second", body: "Second body", time: new Date(), href: null }],
  },
];

describe("NotificationsWidget bulk deletion", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryState.data = queryData;
    mocks.queryState.isPending = false;
    mocks.queryState.isFetching = false;
    mocks.useDeleteNotificationMutation.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mocks.invalidateNotifications.mockResolvedValue(undefined);

    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));

    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  test("requires a second click and invalidates once after partial failures settle", async () => {
    let rejectPendingDelete!: (error: Error) => void;
    const pendingDelete = new Promise<never>((_resolve, reject) => {
      rejectPendingDelete = reject;
    });
    mocks.deleteNotification.mockImplementation(({ notificationId }: { notificationId: string }) =>
      notificationId === "ha-message" ? pendingDelete : Promise.resolve(),
    );

    let resolveInvalidation!: () => void;
    const pendingInvalidation = new Promise<void>((resolve) => {
      resolveInvalidation = resolve;
    });
    mocks.invalidateNotifications.mockReturnValue(pendingInvalidation);

    await act(() =>
      root.render(
        <MantineProvider env="test">
          <NotificationsWidget {...widgetProps} />
        </MantineProvider>,
      ),
    );

    const bulkDeleteButton = host.querySelector("button");
    expect(bulkDeleteButton?.textContent).toBe("Delete all");

    await act(() => bulkDeleteButton?.click());
    expect(mocks.deleteNotification).not.toHaveBeenCalled();

    const confirmButton = host.querySelector("button");
    expect(confirmButton?.textContent).toBe("Click again");
    expect(confirmButton?.title).toContain("2 notifications across");
    expect(confirmButton?.title).toContain("Gotify");
    expect(confirmButton?.title).toContain("Home Assistant");

    await act(async () => {
      confirmButton?.click();
      await Promise.resolve();
    });
    expect(mocks.deleteNotification).toHaveBeenCalledTimes(2);
    expect(mocks.invalidateNotifications).not.toHaveBeenCalled();

    await act(async () => {
      rejectPendingDelete(new Error("Delete failed"));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mocks.invalidateNotifications).toHaveBeenCalledOnce();
    expect(mocks.invalidateNotifications).toHaveBeenCalledWith();
    expect(mocks.showErrorNotification).toHaveBeenCalledWith({
      title: "Could not delete notifications",
      message: "Some notifications could not be deleted. Please try again.",
    });
    expect(host.querySelector("button")?.disabled).toBe(true);

    await act(async () => {
      resolveInvalidation();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.querySelector("button")?.textContent).toBe("Delete all");
  });
});
