import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";

import { isTerminalCustomWidgetDefinitionError } from "./migration-state";
import { clearSharedWidgetSubscriptions, refreshSharedWidgetSubscriptions } from "./trusted-widget-subscriptions";

export function usePackageLifecycle({
  itemId,
  enabled,
  refresh,
}: {
  itemId?: string;
  enabled: boolean;
  refresh(): Promise<{ error: unknown }>;
}) {
  const queryClient = useQueryClient();
  const [accessError, setAccessError] = useState<Error | null>(null);
  useEffect(() => setAccessError(null), [itemId]);
  const belongsToPlacement = (query: { queryKey: readonly unknown[] }) =>
    query.queryKey[0] === "custom-widget-sdk" && query.queryKey[2] === itemId;
  clientApi.widget.customApi.packageLifecycle.useSubscription(
    { itemId: itemId ?? "" },
    {
      enabled: enabled && Boolean(itemId),
      onData(event) {
        if (event.kind === "storage") {
          void queryClient.invalidateQueries({
            predicate: (query) => belongsToPlacement(query) && query.queryKey[4] === "storage",
          });
          return;
        }
        if (event.kind === "disabled") {
          const error = Object.assign(new Error("Widget installation is disabled"), { data: { code: "FORBIDDEN" } });
          setAccessError(error);
          if (itemId) clearSharedWidgetSubscriptions(itemId, error);
          queryClient.removeQueries({ predicate: belongsToPlacement });
        } else if (itemId) refreshSharedWidgetSubscriptions(itemId);
        void queryClient.invalidateQueries({ predicate: belongsToPlacement });
        void refresh().then((result) => {
          if (!result.error) setAccessError(null);
        });
      },
      onError(error) {
        if (!isTerminalCustomWidgetDefinitionError(error)) return;
        setAccessError(new Error(error.message));
        if (itemId)
          clearSharedWidgetSubscriptions(itemId, Object.assign(new Error(error.message), { data: error.data }));
        queryClient.removeQueries({ predicate: belongsToPlacement });
        void refresh().then((result) => {
          if (!result.error) setAccessError(null);
        });
      },
    },
  );
  return accessError;
}
