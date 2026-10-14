// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { VpnIntegrationCard } from "./vpn-card";

vi.mock("@homarr/boards/context", () => ({ useRequiredBoard: () => ({ itemRadius: "sm" }) }));
vi.mock("@homarr/translation/client", () => ({ useI18n: () => (key: string) => key }));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
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

test("renders the minimal authenticated VPN summary with unknown DNS and no invented provider", async () => {
  await act(() =>
    root.render(
      <MantineProvider env="test">
        <VpnIntegrationCard vpn={{ vpnStatus: "running", publicIp: "203.0.113.42" }} />
      </MantineProvider>,
    ),
  );
  expect(host.textContent).toContain("203.0.113.42");
  expect(host.textContent).toContain("status.unavailable");
  expect(host.querySelector(".tabler-icon-circle-x-filled")).toBeNull();
  expect(host.querySelector(".tabler-icon-question-mark")).not.toBeNull();
  expect(host.querySelector(".tabler-icon-arrows-exchange")).toBeNull();
  expect(host.querySelector(".mantine-Badge-root")?.getAttribute("style")).toContain("gray");
});

test("retains known DNS/provider details supplied by other summaries", async () => {
  await act(() =>
    root.render(
      <MantineProvider env="test">
        <VpnIntegrationCard
          vpn={{
            vpnStatus: "running",
            publicIp: "203.0.113.42",
            dnsStatus: "running",
            city: "Berlin",
            country: "Germany",
            vpnProvider: { provider: "Fixture provider", protocol: "wireguard" },
          }}
        />
      </MantineProvider>,
    ),
  );
  expect(host.textContent).toContain("Fixture provider");
  expect(host.textContent).toContain("Berlin, Germany");
  expect(host.querySelector(".tabler-icon-circle-check-filled")).not.toBeNull();
});
