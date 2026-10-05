"use client";

import { useEffect } from "react";

import type { QueryKey } from "@tanstack/react-query";

import type { WidgetRuntimeActions, WidgetRuntimeRef } from "./definition";
import { normalizeWidgetQuery } from "./definition";

export const useWidgetRuntimeQueries = (
  widgetRuntimeRef: WidgetRuntimeRef | undefined,
  queryKeys: readonly QueryKey[],
) => {
  useEffect(() => {
    if (!widgetRuntimeRef) return;
    const runtime = widgetRuntimeRef.current;
    const queries = queryKeys.flatMap((queryKey) => {
      const query = normalizeWidgetQuery(queryKey);
      return query ? [query] : [];
    });
    runtime.queries = queries;
    return () => {
      if (runtime.queries === queries) runtime.queries = [];
    };
  }, [queryKeys, widgetRuntimeRef]);
};

export const useWidgetRuntimeActions = (
  widgetRuntimeRef: WidgetRuntimeRef | undefined,
  actions: WidgetRuntimeActions,
) => {
  useEffect(() => {
    if (!widgetRuntimeRef) return;
    const runtime = widgetRuntimeRef.current;
    runtime.actions = actions;
    return () => {
      if (runtime.actions === actions) runtime.actions = {};
    };
  }, [actions, widgetRuntimeRef]);
};
