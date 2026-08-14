"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { TanStackDevtoolsReactPlugin } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";

const valueStyle = { fontFamily: "monospace", overflowWrap: "anywhere" } as const;
const metricStyle = {
  background: "color-mix(in srgb, currentColor 4%, transparent)",
  border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
  borderRadius: 8,
  padding: 12,
} as const;

const readDiagnostics = (queryClient: QueryClient) => {
  const queries = queryClient.getQueryCache().getAll();
  const mutations = queryClient.getMutationCache().getAll();
  const board = document.querySelector("[data-homarr-dev-benchmark-board]");
  const widgetItems = board?.querySelectorAll('[data-type="item"]').length ?? 0;
  const readyWidgets = board?.querySelectorAll("[data-homarr-widget-ready]").length ?? 0;
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

  return {
    active: queries.filter((query) => query.getObserversCount() > 0).length,
    errors: queries.filter((query) => query.state.status === "error").length,
    fetching: queries.filter((query) => query.state.fetchStatus === "fetching").length,
    pendingMutations: mutations.filter((mutation) => mutation.state.status === "pending").length,
    stale: queries.filter((query) => query.isStale()).length,
    total: queries.length,
    readyWidgets,
    widgetItems,
    scriptKiB: Math.round(
      resources
        .filter((resource) => resource.initiatorType === "script")
        .reduce((total, resource) => total + resource.decodedBodySize, 0) / 1024,
    ),
  };
};

const Metric = ({ label, value }: { label: string; value: number | string }) => (
  <div style={metricStyle}>
    <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
    <output style={{ ...valueStyle, display: "block", fontSize: 22, fontWeight: 600, marginTop: 4 }}>{value}</output>
  </div>
);

const HomarrDevtoolsPanel = ({ active }: { active: boolean }) => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [diagnostics, setDiagnostics] = useState(() => readDiagnostics(queryClient));

  useEffect(() => {
    if (!active) return;

    const update = () => setDiagnostics(readDiagnostics(queryClient));
    let frame: number | undefined;
    const scheduleUpdate = () => {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        update();
      });
    };
    const unsubscribeQueries = queryClient.getQueryCache().subscribe(scheduleUpdate);
    const unsubscribeMutations = queryClient.getMutationCache().subscribe(scheduleUpdate);
    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, { childList: true, subtree: true });
    update();

    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
      observer.disconnect();
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [active, pathname, queryClient]);

  if (!active) return null;

  return (
    <section data-homarr-devtools-panel style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Homarr performance</h2>
        <p style={{ marginBlock: "4px 0", opacity: 0.7 }}>Live state for {pathname}</p>
      </header>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
        <Metric label="Queries" value={diagnostics.total} />
        <Metric label="Active" value={diagnostics.active} />
        <Metric label="Fetching" value={diagnostics.fetching} />
        <Metric label="Stale" value={diagnostics.stale} />
        <Metric label="Errors" value={diagnostics.errors} />
        <Metric label="Mutations" value={diagnostics.pendingMutations} />
        <Metric label="Widgets ready" value={`${diagnostics.readyWidgets}/${diagnostics.widgetItems}`} />
        <Metric label="Script KiB" value={diagnostics.scriptKiB} />
      </div>
    </section>
  );
};

const developmentToolsPlugins = [
  {
    id: "tanstack-query",
    name: "TanStack Query",
    render: () => <ReactQueryDevtoolsPanel />,
  },
  {
    id: "homarr-performance",
    name: "Homarr",
    defaultOpen: true,
    render: (_element, { devtoolsOpen }) => <HomarrDevtoolsPanel active={devtoolsOpen} />,
  },
] satisfies TanStackDevtoolsReactPlugin[];

export const DevelopmentTools = () => (
  <TanStackDevtools config={{ position: "bottom-right", hideUntilHover: true }} plugins={developmentToolsPlugins} />
);
