"use client";

import { useEffect, useRef, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import type { WidgetKind } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import { getWidgetQueryKeys, widgetQueryValueEquals } from "@homarr/widgets/definition";
import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import { matchesWidgetItemQuery } from "../../items/widget-query-scope";

interface UseWidgetActivitySignalInput {
  boardId: string | undefined;
  itemId: string;
  kind: WidgetKind;
  options: Record<string, unknown>;
  integrationIds: string[];
}

export const useWidgetActivitySignal = ({
  boardId,
  itemId,
  kind,
  options,
  integrationIds,
}: UseWidgetActivitySignalInput): boolean | null => {
  const queryClient = useQueryClient();
  const settings = useSettings();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const terminalErrorsRef = useRef<{
    queryClient: typeof queryClient;
    scope: unknown;
    queryHashes: Set<string>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cleanupRef = { current: undefined as (() => void) | undefined };

    void loadWidgetDefinition(kind).then((definition) => {
      if (cancelled) return;
      const activitySignal = definition.activitySignal;
      if (!activitySignal) {
        terminalErrorsRef.current = null;
        setIsActive(null);
        return;
      }

      if (
        "supportedIntegrations" in definition &&
        (definition.supportedIntegrations?.length ?? 0) > 0 &&
        (!("integrationsRequired" in definition) || definition.integrationsRequired !== false) &&
        integrationIds.length === 0
      ) {
        terminalErrorsRef.current = null;
        setIsActive(true);
        return;
      }

      const widgetQueryKeys = getWidgetQueryKeys(definition, kind);
      const reducedOptions = reduceWidgetOptionsWithDefinition(definition, settings, options);
      const scope = { itemId, boardId, integrationIds, options: reducedOptions, runtimeQueries: [] };
      const matches = (queryKey: QueryKey) =>
        matchesWidgetItemQuery(queryKey, widgetQueryKeys, scope, definition.queryMatcher);

      const activityScope = { kind, ...scope, integrationIds: integrationIds.toSorted() };
      let terminalErrors = terminalErrorsRef.current;
      if (
        !terminalErrors ||
        terminalErrors.queryClient !== queryClient ||
        !widgetQueryValueEquals(terminalErrors.scope, activityScope)
      ) {
        terminalErrors = { queryClient, scope: activityScope, queryHashes: new Set() };
        terminalErrorsRef.current = terminalErrors;
      }
      const failedQueryHashes = terminalErrors.queryHashes;

      const evaluate = () => {
        const queries = queryClient.getQueryCache().findAll({ predicate: (query) => matches(query.queryKey) });
        // Error boundaries remove observers, so cache eviction must not dismiss their error UI.
        for (const query of queries) {
          if (query.state.status === "error") failedQueryHashes.add(query.queryHash);
          if (query.state.status === "success") failedQueryHashes.delete(query.queryHash);
        }
        setIsActive(
          failedQueryHashes.size > 0 ||
            queries.some(
              (query) => query.isActive() && query.state.data !== undefined && activitySignal(query.state.data),
            ),
        );
      };

      evaluate();
      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        if (matches(event.query.queryKey)) evaluate();
      });
      cleanupRef.current = unsubscribe;
    });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, [boardId, integrationIds, itemId, kind, options, queryClient, settings]);

  return isActive;
};
