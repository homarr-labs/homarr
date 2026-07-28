import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { Root } from "react-dom/client";
import type * as MantineCoreExports from "@mantine/core";
import type * as TablerIconsExports from "@tabler/icons-react";

import CustomJsxDisplay from "./custom-jsx-display";

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    useUtils: () => ({
      widget: {
        customApi: {
          getData: {
            invalidate: vi.fn(),
          },
        },
      },
    }),
  },
  fetchApi: {
    customWidget: {
      previewAction: { mutate: vi.fn() },
      previewQuery: { query: vi.fn() },
      previewRefresh: { mutate: vi.fn() },
    },
    widget: {
      customApi: {
        executeAction: { mutate: vi.fn() },
        queryRequest: { query: vi.fn() },
        refreshQueries: { mutate: vi.fn() },
      },
    },
  },
}));

vi.mock("@homarr/modals", () => ({
  useConfirmModal: () => ({ openConfirmModal: vi.fn() }),
}));

vi.mock("@homarr/notifications", () => ({
  showErrorNotification: vi.fn(),
  showSuccessNotification: vi.fn(),
}));

vi.mock("@homarr/translation/client", () => ({
  useScopedI18n: () => (key: string) => (key === "refresh" ? "Refresh" : key),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@mantine/core", async (importOriginal) => {
  const original = await importOriginal<typeof MantineCoreExports>();
  const renderElement = createElement;
  const MockContainer = ({ children }: { children?: ReactNode }) => renderElement("div", null, children);
  const ActionIcon = ({
    children,
    loading: _loading,
    color: _color,
    variant: _variant,
    size: _size,
    ...props
  }: ComponentPropsWithoutRef<"button"> & {
    children?: ReactNode;
    loading?: boolean;
    color?: string;
    variant?: string;
    size?: string;
  }) => renderElement("button", props, children);

  return {
    ...original,
    ActionIcon,
    Alert: MockContainer,
    Box: MockContainer,
    Stack: MockContainer,
    Text: MockContainer,
  };
});

vi.mock("@tabler/icons-react", async (importOriginal) => {
  const original = await importOriginal<typeof TablerIconsExports>();
  return {
    ...original,
    IconRefresh: () => createElement("span", { "aria-hidden": true }),
  };
});

describe("CustomJsxDisplay preview refresh", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, writable: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const renderPreview = async (canInvalidateQueries?: boolean) => {
    await act(async () => {
      root.render(
        <CustomJsxDisplay
          data={{
            template: '<RefreshButton label="Refresh" />',
            data: {},
            previewSessionId: "preview-session",
            ...(canInvalidateQueries === undefined ? {} : { canInvalidateQueries }),
          }}
        />,
      );
    });
    return container.querySelector<HTMLButtonElement>('button[aria-label="Refresh"]');
  };

  it("enables refresh when a preview session omits the invalidation capability", async () => {
    const button = await renderPreview();

    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(false);
  });

  it("honors an explicitly disabled invalidation capability", async () => {
    const button = await renderPreview(false);

    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
  });
});
