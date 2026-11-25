"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

import { clientApi, fetchApi } from "@homarr/api/client";
import { isRecord } from "@homarr/common";
import { getCustomWidgetConfirmation } from "@homarr/custom-widgets/core";

import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { WidgetError } from "../errors/component";

const CustomJsxDisplay = dynamic(() => import("./custom-jsx-display"), { ssr: false });

export const CustomWidgetEditorPreview = ({ options }: Pick<WidgetComponentProps<"customApi">, "options">) => {
  const utils = clientApi.useUtils();
  const currentConfigurationKey = JSON.stringify(options.configuration ?? {});
  const snapshot = useMemo(
    () => ({
      definitionId: options.definitionId,
      configurationVersion: options.configurationVersion,
      configurationKey: currentConfigurationKey,
    }),
    [options.definitionId, options.configurationVersion, currentConfigurationKey],
  );
  const [{ definitionId, configurationVersion, configurationKey }] = useDebouncedValue(snapshot, 250);
  const query = useQuery({
    queryKey: ["custom-widget-editor-preview", definitionId, configurationVersion, configurationKey],
    enabled: Boolean(definitionId),
    staleTime: 30_000,
    gcTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const stored = await utils.customWidget.get.fetch({ id: definitionId });
      const configuration: unknown = JSON.parse(configurationKey);
      const definition = {
        $schema: stored.$schema,
        name: stored.name,
        description: stored.description,
        iconUrl: stored.iconUrl,
        sources: stored.sources,
        requests: stored.requests,
        options: stored.options,
        template: stored.template,
      };
      signal.throwIfAborted();
      const created = await fetchApi.customWidget.previewCreate.mutate({
        definitionId,
        definition,
        options: isRecord(configuration) ? configuration : {},
      });
      signal.throwIfAborted();
      const entries = await Promise.all(
        Object.entries(definition.requests)
          .filter(([, request]) => request.kind === "query" && request.trigger === "load")
          .map(async ([requestId]) => {
            try {
              const result = await fetchApi.customWidget.previewQuery.query(
                { sessionId: created.previewSession.id, requestId },
                { signal },
              );
              return [
                requestId,
                {
                  data: result.data,
                  status: { loading: false, ok: result.ok, status: result.status, error: result.error },
                },
              ] as const;
            } catch (error) {
              signal.throwIfAborted();
              return [
                requestId,
                {
                  data: null,
                  status: {
                    loading: false,
                    ok: false,
                    error: error instanceof Error ? error.message : "Request failed",
                  },
                },
              ] as const;
            }
          }),
      );
      return {
        template: definition.template,
        options: configuration,
        widgetDefinitionId: definitionId,
        previewSessionId: created.previewSession.id,
        previewLiveActions: false,
        isEditMode: true,
        data: Object.fromEntries(entries.map(([id, result]) => [id, result.data])),
        status: Object.fromEntries(entries.map(([id, result]) => [id, result.status])),
        requestCapabilities: Object.entries(definition.requests).map(([id, request]) => ({
          id,
          kind: request.kind,
          method: request.method,
          trigger: request.trigger,
          minimumBoardPermission: request.permission,
          confirmation: getCustomWidgetConfirmation(request),
          invalidates: request.invalidates ?? [],
        })),
      };
    },
  });

  if (query.isPending) return <WidgetQueryLoadingState />;
  if (query.error) return <WidgetError error={query.error} resetErrorBoundary={() => void query.refetch()} />;
  return <CustomJsxDisplay data={query.data} />;
};
