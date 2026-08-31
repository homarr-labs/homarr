// @vitest-environment jsdom

import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Analytics } from "./analytics";

const postHogMock = vi.hoisted(() => {
  let resolveImport: (() => void) | undefined;
  const importGate = new Promise<void>((resolve) => {
    resolveImport = resolve;
  });

  return {
    importGate,
    init: vi.fn(),
    releaseImport: () => resolveImport?.(),
  };
});

vi.mock("posthog-js", async () => {
  await postHogMock.importGate;
  return { default: { init: postHogMock.init } };
});

const host = document.createElement("div");
const root = createRoot(host);

afterEach(() => {
  act(() => root.unmount());
});

describe("Analytics", () => {
  it("deduplicates Strict Mode initialization and retries after a failure", async () => {
    const initializationError = new Error("initialization failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    postHogMock.init.mockImplementationOnce(() => {
      throw initializationError;
    });

    await act(async () => {
      root.render(
        <StrictMode>
          <Analytics enabled />
        </StrictMode>,
      );
    });

    postHogMock.releaseImport();

    await vi.waitFor(() => {
      expect(postHogMock.init).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalledWith("PostHog initialization failed", initializationError);
    });

    await act(async () => {
      root.render(
        <StrictMode>
          <Analytics enabled={false} />
        </StrictMode>,
      );
    });
    await act(async () => {
      root.render(
        <StrictMode>
          <Analytics enabled />
        </StrictMode>,
      );
    });

    await vi.waitFor(() => {
      expect(postHogMock.init).toHaveBeenCalledTimes(2);
    });
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
