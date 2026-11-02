"use client";

import type { ComponentType, ReactNode } from "react";
import {
  Component,
  createElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Box, Text } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { createCustomJsxBindings, createCustomJsxComponents, createSafeCallable } from "@homarr/custom-widgets/jsx";
import { customJsxTablerIconNames, customJsxTablerIconSpriteBasePath } from "@homarr/custom-widgets/tabler-icons";
import { CustomJsxRenderer, CustomWidgetRuntimeProvider } from "@homarr/custom-widgets/runtime";
import type { CustomWidgetPublishedQueryState } from "@homarr/custom-widgets/runtime";

import { ARENA_VIEWPORTS } from "./_arena-contract";
import type { ArenaState, ArenaViewport } from "./_arena-contract";
import type { BlindDataset } from "./_review";
import { createSimulationPort, fixtureResult, runtimeMessages } from "./_simulation";

const icons: ReadonlySet<string> = new Set(customJsxTablerIconNames);

function ArenaIcon(props: { name?: string; size?: number | string; color?: string; stroke?: number }) {
  if (!props.name || !icons.has(props.name)) return null;
  let name = props.name;
  if (name === "pulse") name = "heartbeat";
  let sprite = "outline";
  let symbol = `tabler-${name}`;
  if (name.endsWith("-filled")) {
    sprite = "filled";
    symbol = `tabler-filled-${name.slice(0, -7)}`;
  }
  return (
    <svg
      width={props.size ?? 24}
      height={props.size ?? 24}
      viewBox="0 0 24 24"
      color={props.color ?? "currentColor"}
      strokeWidth={props.stroke ?? 2}
      aria-hidden="true"
    >
      <use href={`${customJsxTablerIconSpriteBasePath}/${sprite}.svg#${symbol}`} />
    </svg>
  );
}

const runtimeComponents = createCustomJsxComponents({
  TablerIcon: ArenaIcon as ComponentType<never>,
  copyLabels: { copy: "Copy", copied: "Copied" },
});

function localProps(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (/^(?:href|srcSet|poster|background|action|formAction|iconUrl|srcDoc)$/i.test(key)) continue;
    if (key === "src" && value !== "/images/demo-dashboard-background.svg") continue;
    if (typeof value === "string" && /(?:url\s*\(|@import)/i.test(value)) continue;
    if (value && typeof value === "object" && !Array.isArray(value) && !isValidElement(value))
      result[key] = localProps(value as Record<string, unknown>);
    else result[key] = value;
  }
  return result;
}

const components = Object.fromEntries(
  Object.entries(runtimeComponents).map(([name, RuntimeComponent]) => [
    name,
    ((props: Record<string, unknown>) =>
      createElement(RuntimeComponent, localProps(props) as never)) as ComponentType<never>,
  ]),
);

function bindings(data: unknown) {
  const original = createCustomJsxBindings(data);
  const date = original.Date;
  const safeDate = typeof date === "object" && date !== null ? date : {};
  return {
    ...original,
    Date: {
      ...safeDate,
      now: createSafeCallable(() => Date.parse("2026-11-02T12:00:00Z")),
    },
  };
}

class FrameBoundary extends Component<{ children: ReactNode; onFailure(): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    if (this.state.failed) return <Text>Candidate unavailable</Text>;
    return this.props.children;
  }
}

export function WidgetFrame({
  candidate,
  fixture,
  state,
  viewport,
  onFailure,
  onReady,
}: {
  candidate: BlindDataset["candidates"][number];
  fixture: BlindDataset["cases"][number];
  state: ArenaState;
  viewport: ArenaViewport;
  onFailure(): void;
  onReady?(): void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const dimensions = ARENA_VIEWPORTS.find((entry) => entry.id === viewport) ?? ARENA_VIEWPORTS[0];
  const initialize = () => {
    const document = frame.current?.contentDocument;
    if (!document) return;
    document.documentElement.dataset.mantineColorScheme = window.document.documentElement.dataset.mantineColorScheme;
    document.documentElement.style.cssText = window.document.documentElement.style.cssText;
    for (const element of window.document.querySelectorAll("style, link[rel=stylesheet]"))
      document.head.append(element.cloneNode(true));
    document.body.style.margin = "0";
    document.body.style.padding = "12px";
    document.body.style.boxSizing = "border-box";
    document.addEventListener(
      "click",
      (event) => {
        const node = event.target;
        const ElementType = document.defaultView?.Element;
        if (ElementType && node instanceof ElementType && node.closest("a")) event.preventDefault();
      },
      true,
    );
    document.addEventListener("submit", (event) => event.preventDefault(), true);
    document.addEventListener("keydown", (event) => {
      if (!["1", "2"].includes(event.key) || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const ElementType = document.defaultView?.Element;
      if (
        ElementType &&
        event.target instanceof ElementType &&
        event.target.closest(
          "input, textarea, select, button, a, [contenteditable=true], [role=combobox], [role=slider], [role=switch]",
        )
      )
        return;
      event.preventDefault();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: event.key }));
    });
    setTarget(document.body);
  };
  useLayoutEffect(() => {
    if (!target) return;
    const inspect = () => {
      const failure =
        target.textContent?.includes("RUNTIME_RENDER_ERROR") ||
        Array.from(target.querySelectorAll(".mantine-Alert-root")).some((element) =>
          element.textContent?.includes("Candidate unavailable"),
        );
      if (failure) {
        if (frame.current) frame.current.style.visibility = "hidden";
        onFailure();
        return;
      }
      if (frame.current && target.childNodes.length > 0) {
        frame.current.style.visibility = "visible";
        onReady?.();
      }
    };
    const observer = new MutationObserver(inspect);
    observer.observe(target, { childList: true, subtree: true });
    inspect();
    return () => observer.disconnect();
  }, [onFailure, onReady, target]);
  if (!candidate.definition || candidate.status !== "ready")
    return (
      <Box h={dimensions.height} p="md">
        <Text c="dimmed">Candidate unavailable</Text>
      </Box>
    );
  if (!origin) return <Box h={dimensions.height} />;
  return (
    <>
      <iframe
        ref={frame}
        title="Interactive simulated widget"
        sandbox="allow-same-origin"
        onLoad={initialize}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: "block", border: 0, flexShrink: 0, visibility: "hidden" }}
        srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; img-src ${origin}/images/demo-dashboard-background.svg ${origin}${customJsxTablerIconSpriteBasePath}/; font-src 'self' data:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'"></head><body></body></html>`}
      />
      {target &&
        createPortal(
          <FrameBoundary onFailure={onFailure}>
            <RuntimeWidget candidate={candidate} fixture={fixture} state={state} />
          </FrameBoundary>,
          target,
        )}
    </>
  );
}

function RuntimeWidget({
  candidate,
  fixture,
  state,
}: {
  candidate: BlindDataset["candidates"][number];
  fixture: BlindDataset["cases"][number];
  state: ArenaState;
}) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
  );
  const [published, setPublished] = useState<Record<string, CustomWidgetPublishedQueryState>>({});
  const [notice, setNotice] = useState("");
  const publish = useCallback((id: string, value: CustomWidgetPublishedQueryState | null) => {
    setPublished((current) => {
      const previous = current[id];
      if (JSON.stringify(previous) === JSON.stringify(value)) return current;
      const next = { ...current };
      if (value) next[id] = value;
      else delete next[id];
      return next;
    });
  }, []);
  const port = useMemo(
    () =>
      createSimulationPort({
        fixture,
        state,
        invalidate: async () => {
          setNotice("Refresh simulated locally.");
          await queryClient.invalidateQueries();
        },
        notify: setNotice,
        confirm: async () => window.confirm("Simulate this action? No live service will be changed."),
      }),
    [fixture, queryClient, state],
  );
  const definition = candidate.definition;
  if (!definition) return null;
  const data: Record<string, unknown> = {};
  const status: Record<string, unknown> = {};
  for (const [id, request] of Object.entries(definition.requests)) {
    if (request.trigger === "manual" || request.kind === "action") continue;
    const result = fixtureResult(fixture, state, id);
    data[id] = state === "loading" ? null : result.data;
    status[id] = {
      loading: state === "loading",
      ok: state === "loading" ? undefined : result.ok,
      status: state === "loading" ? undefined : result.status,
      error: result.error,
    };
  }
  for (const [id, value] of Object.entries(published)) {
    data[id] = value.data;
    status[id] = value.status;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <CustomWidgetRuntimeProvider
        itemId={candidate.id}
        definitionId={candidate.id}
        queryCacheKey={candidate.id}
        isEditMode={false}
        requestCapabilities={Object.entries(definition.requests).map(([id, request]) => ({
          id,
          kind: request.kind,
          method: request.method,
          trigger: request.trigger ?? "load",
          minimumBoardPermission: request.permission,
          confirmation:
            typeof request.confirmation === "string"
              ? { title: "Simulate action", message: request.confirmation }
              : request.confirmation,
          invalidates: request.invalidates,
        }))}
        port={port}
        messages={runtimeMessages}
        setQueryState={publish}
      >
        <CustomJsxRenderer
          template={definition.template}
          data={data}
          status={status}
          options={fixture.defaultOptions}
          components={components}
          createBindings={bindings}
          messages={{
            noTemplate: "Candidate unavailable",
            templateWarnings: () => "Candidate unavailable",
            bindingTypeConflict: () => "Candidate unavailable",
          }}
        />
        {notice && (
          <Text component="output" size="xs" c="dimmed" mt="xs">
            {notice}
          </Text>
        )}
      </CustomWidgetRuntimeProvider>
    </QueryClientProvider>
  );
}
