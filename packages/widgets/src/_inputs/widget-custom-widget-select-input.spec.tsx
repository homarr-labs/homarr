// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WidgetCustomWidgetSelectInput } from "./widget-custom-widget-select-input";

const mocks = vi.hoisted(() => ({
  available: [] as Array<Record<string, unknown>>,
  permissions: ["admin"] as string[],
  setFieldValue: vi.fn(),
}));

vi.mock("@mantine/core", () => {
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- the mock factory is hoisted by Vitest
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Combobox = Object.assign(Container, {
    Target: Container,
    Dropdown: Container,
    Options: Container,
    Group: Container,
    Option: Container,
    Empty: Container,
    Chevron: () => null,
  });

  return {
    Alert: ({ children, title }: { children?: ReactNode; title?: ReactNode }) => (
      <div role="alert">
        <strong>{title}</strong>
        {children}
      </div>
    ),
    Anchor: ({ children, href }: { children?: ReactNode; href?: string }) => <a href={href}>{children}</a>,
    Avatar: Container,
    Badge: Container,
    Combobox,
    Group: Container,
    InputBase: ({ value }: { value?: string }) => <input aria-label="Custom widget" value={value} readOnly />,
    Loader: () => null,
    Stack: Container,
    Text: Container,
    useCombobox: () => ({
      dropdownOpened: false,
      resetSelectedOption: vi.fn(),
      closeDropdown: vi.fn(),
      openDropdown: vi.fn(),
      updateSelectedOptionIndex: vi.fn(),
    }),
  };
});

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    customWidget: {
      available: {
        useQuery: () => ({ data: mocks.available, isLoading: false }),
      },
    },
  },
}));

vi.mock("@homarr/auth/client", () => ({
  useSession: () => ({ data: { user: { permissions: mocks.permissions } } }),
}));

vi.mock("@homarr/boards/context", () => ({
  useOptionalBoard: () => ({ id: "board-1" }),
}));

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) =>
    ({
      migrationRequired: "Migration required",
      migrationDescription: "Copy its redacted prompt to an LLM, then paste the single JSON response into Homarr.",
      manageMigration: "Open Manage custom widgets",
      contactAdmin: "Contact an administrator.",
    })[key] ?? key,
}));

vi.mock("@homarr/ui", () => ({ Link: "a" }));

vi.mock("./form", () => ({
  useFormContext: () => ({
    values: { options: { definitionId: "legacy-widget" } },
    setFieldValue: mocks.setFieldValue,
  }),
}));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.available = [];
  mocks.permissions = ["admin"];
  mocks.setFieldValue.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});

async function renderInput() {
  await act(async () => {
    root.render(
      <WidgetCustomWidgetSelectInput
        kind="customApi"
        property="definitionId"
        options={{ defaultValue: "", withDescription: false }}
        initialOptions={{}}
      />,
    );
  });
}

describe("custom widget picker migration status", () => {
  it("keeps an existing legacy selection visible with migration guidance", async () => {
    mocks.available = [
      {
        id: "legacy-widget",
        name: "Legacy status",
        description: "Old API widget",
        iconUrl: null,
        sources: [],
        requestCapabilities: [],
        defaultOptions: {},
        updatedAt: new Date(0),
        migrationRequired: true,
      },
    ];

    await renderInput();

    expect(host.querySelector("input")?.value).toBe("Legacy status");
    expect(host.textContent).toContain("Migration required");
    expect(host.textContent).toContain("Copy its redacted prompt to an LLM");
    expect(host.querySelector('a[href="/manage/custom-widgets"]')?.textContent).toBe("Open Manage custom widgets");
  });

  it("tells non-admins to contact an administrator without linking management", async () => {
    mocks.permissions = ["board-modify-all"];
    mocks.available = [
      {
        id: "legacy-widget",
        name: "Legacy status",
        description: "Old API widget",
        iconUrl: null,
        sources: [],
        requestCapabilities: [],
        defaultOptions: {},
        updatedAt: new Date(0),
        migrationRequired: true,
      },
    ];

    await renderInput();

    expect(host.textContent).toContain("Contact an administrator.");
    expect(host.querySelector('a[href="/manage/custom-widgets"]')).toBeNull();
  });
});
