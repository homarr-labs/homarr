// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ConfirmModal } from "./confirm-modal";

const ConfirmModalComponent = ConfirmModal.component;

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) => key,
}));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});

describe("ConfirmModal", () => {
  test("clears loading and stays open when confirmation rejects", async () => {
    const closeModal = vi.fn();
    let rejectConfirmation!: (error: Error) => void;
    const pendingConfirmation = new Promise<void>((_resolve, reject) => {
      rejectConfirmation = reject;
    });
    const onConfirm = vi.fn(() => pendingConfirmation);

    await act(async () =>
      root.render(
        <MantineProvider>
          <ConfirmModalComponent actions={{ closeModal }} innerProps={{ children: "Remove containers?", onConfirm }} />
        </MantineProvider>,
      ),
    );

    const confirmButton = host.querySelectorAll("button").item(1);
    await act(async () => confirmButton.click());
    expect(confirmButton.disabled).toBe(true);

    await act(async () => {
      rejectConfirmation(new Error("Removal failed"));
      await Promise.resolve();
    });

    expect(confirmButton.disabled).toBe(false);
    expect(closeModal).not.toHaveBeenCalled();
  });

  test("waits for a rejecting confirmation button callback", async () => {
    const closeModal = vi.fn();
    const onConfirm = vi.fn();
    let rejectClick!: (error: Error) => void;
    const onClick = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectClick = reject;
        }),
    );

    await act(async () =>
      root.render(
        <MantineProvider>
          <ConfirmModalComponent
            actions={{ closeModal }}
            innerProps={{ children: "Remove containers?", confirmProps: { onClick }, onConfirm }}
          />
        </MantineProvider>,
      ),
    );

    const confirmButton = host.querySelectorAll("button").item(1);
    await act(async () => confirmButton.click());
    expect(confirmButton.disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();

    await act(async () => {
      rejectClick(new Error("Callback failed"));
      await Promise.resolve();
    });

    expect(confirmButton.disabled).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });
});
