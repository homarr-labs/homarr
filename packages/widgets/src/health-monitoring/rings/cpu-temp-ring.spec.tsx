// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CpuTempRing } from "./cpu-temp-ring";

describe("CpuTempRing", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
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

  const renderRing = async (cpuTemp: number, fahrenheit = false) => {
    await act(() =>
      root.render(
        <MantineProvider env="test">
          <CpuTempRing cpuTemp={cpuTemp} fahrenheit={fahrenheit} isTiny={false} ariaLabel="CPU temperature" />
        </MantineProvider>,
      ),
    );

    return host.querySelector('[role="meter"]');
  };

  test("renders a zero temperature reading", async () => {
    const meter = await renderRing(0);

    expect(meter).not.toBeNull();
    expect(meter?.getAttribute("aria-valuenow")).toBe("0");
    expect(meter?.getAttribute("aria-valuetext")).toBe("0.0°C");
  });

  test("clamps readings above the configured maximum consistently", async () => {
    const meter = await renderRing(150, true);

    expect(meter?.getAttribute("aria-valuenow")).toBe("100");
    expect(meter?.getAttribute("aria-valuemax")).toBe("100");
    expect(meter?.getAttribute("aria-valuetext")).toBe("212.0°F");
    expect(meter?.textContent).toContain("212.0°F");
  });
});
