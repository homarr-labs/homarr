// @vitest-environment jsdom

import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { WidgetRuntimeRef } from "./definition";
import { createWidgetRuntimeState, getWidgetRuntimeQueries } from "./definition";
import { useWidgetRuntimeActions, useWidgetRuntimeQueries } from "./runtime-hooks";

const queryPath = ["widget", "calendar", "findAllEvents"] as const;

const RuntimeRegistration = ({
  runtimeRef,
  month,
  action,
}: {
  runtimeRef: WidgetRuntimeRef;
  month: number;
  action?: () => void;
}) => {
  useWidgetRuntimeQueries(runtimeRef, [[queryPath, { input: { month } }]]);
  useWidgetRuntimeActions(runtimeRef, action ? { togglePolling: action } : {});
  return null;
};

describe("widget runtime registration", () => {
  let host: HTMLDivElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    host?.remove();
    vi.unstubAllGlobals();
  });

  test("does not publish query identity from an uncommitted render", () => {
    const runtimeRef = { current: createWidgetRuntimeState() };

    renderToString(createElement(RuntimeRegistration, { runtimeRef, month: 6 }));

    expect(getWidgetRuntimeQueries(runtimeRef)).toEqual([]);
    expect(runtimeRef.current.actions).toEqual({});
  });

  test("survives StrictMode, replaces option-dependent queries, and cleans up on remount", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    const runtimeRef = { current: createWidgetRuntimeState() };
    const action = vi.fn();

    await act(async () =>
      root?.render(
        createElement(StrictMode, null, createElement(RuntimeRegistration, { runtimeRef, month: 6, action })),
      ),
    );
    expect(getWidgetRuntimeQueries(runtimeRef)).toEqual([{ path: queryPath, input: { month: 6 } }]);
    expect(runtimeRef.current.actions.togglePolling).toBe(action);

    await act(async () =>
      root?.render(
        createElement(StrictMode, null, createElement(RuntimeRegistration, { runtimeRef, month: 7, action })),
      ),
    );
    expect(getWidgetRuntimeQueries(runtimeRef)).toEqual([{ path: queryPath, input: { month: 7 } }]);
    expect(runtimeRef.current.actions.togglePolling).toBe(action);

    await act(async () => root?.render(null));
    expect(getWidgetRuntimeQueries(runtimeRef)).toEqual([]);
    expect(runtimeRef.current.actions).toEqual({});

    await act(async () => root?.render(createElement(RuntimeRegistration, { runtimeRef, month: 8, action })));
    expect(getWidgetRuntimeQueries(runtimeRef)).toEqual([{ path: queryPath, input: { month: 8 } }]);
    expect(runtimeRef.current.actions.togglePolling).toBe(action);
  });
});

const assertRuntimeActionTypes = () => {
  const runtime = createWidgetRuntimeState();
  runtime.actions.togglePolling = () => undefined;
  // @ts-expect-error Unknown runtime actions are rejected.
  runtime.actions.unknownAction = () => undefined;
};

void assertRuntimeActionTypes;
