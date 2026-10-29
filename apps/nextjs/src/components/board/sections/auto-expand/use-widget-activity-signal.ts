"use client";

import { useEffect, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import type { WidgetKind } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import { getWidgetQueryKeys } from "@homarr/widgets/definition";
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

  useEffect(() => {
    let cancelled = false;
    const cleanupRef = { current: undefined as (() => void) | undefined };

    void loadWidgetDefinition(kind).then((definition) => {
      if (cancelled) return;
      const activitySignal = definition.activitySignal;
      if (!activitySignal) {
        setIsActive(null);
        return;
      }

      const widgetQueryKeys = getWidgetQueryKeys(definition, kind);
      const reducedOptions = reduceWidgetOptionsWithDefinition(definition, settings, options);
      const scope = { itemId, boardId, integrationIds, options: reducedOptions, runtimeQueries: [] };
      const matches = (queryKey: QueryKey) =>
        matchesWidgetItemQuery(queryKey, widgetQueryKeys, scope, definition.queryMatcher);

      const evaluate = () => {
        const queries = queryClient
          .getQueryCache()
          .findAll({ type: "active", predicate: (query) => matches(query.queryKey) });
        setIsActive(
          queries.some(
            (query) =>
              query.state.status === "error" || (query.state.data !== undefined && activitySignal(query.state.data)),
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
