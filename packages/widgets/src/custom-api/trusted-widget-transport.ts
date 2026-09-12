import { useMemo, useRef } from "react";
import { hashKey } from "@tanstack/react-query";
import { clientApi, fetchApi } from "@homarr/api/client";
import type { WidgetTransport } from "@homarr/widget-sdk/shared";
import { subscribeSharedWidget } from "./trusted-widget-subscriptions";

export function useTrustedWidgetTransport(previewId: string | undefined, subscriptionScope: string, frozen = false) {
  const client = clientApi.useUtils().client;
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const assertExecuting = () => {
    if (frozenRef.current) throw new Error("The retained preview is paused. Preview the current draft to resume.");
  };
  const transport = useMemo<WidgetTransport>(
    () => ({
      query: (input, signal) => {
        assertExecuting();
        if (previewId)
          return fetchApi.customWidget.package.previewQuery.query(
            { previewId: previewId, name: input.name, input: input.input },
            { signal },
          );
        return fetchApi.widget.customApi.packageQuery.query(input, { signal });
      },
      action: (input) => {
        assertExecuting();
        if (previewId)
          return fetchApi.customWidget.package.previewAction.mutate({
            previewId: previewId,
            name: input.name,
            input: input.input,
          });
        return fetchApi.widget.customApi.packageAction.mutate(input);
      },
      subscribe(input, observer) {
        if (frozenRef.current) {
          observer.complete();
          return () => undefined;
        }
        return subscribeSharedWidget(
          hashKey([subscriptionScope, input]),
          input.itemId,
          (sharedObserver) => {
            if (previewId) {
              const subscription = client.customWidget.package.previewSubscription.subscribe(
                { previewId: previewId, name: input.name, input: input.input },
                {
                  onData: sharedObserver.next,
                  onError: sharedObserver.error,
                  onComplete: sharedObserver.complete,
                },
              );
              return () => subscription.unsubscribe();
            }
            const subscription = client.widget.customApi.packageSubscription.subscribe(input, {
              onData: sharedObserver.next,
              onError: sharedObserver.error,
              onComplete: sharedObserver.complete,
            });
            return () => subscription.unsubscribe();
          },
          observer,
        );
      },
      storageGet: (input, signal) => {
        assertExecuting();
        if (previewId)
          return fetchApi.customWidget.package.previewStorageGet.query(
            { previewId, scope: input.scope, key: input.key },
            { signal },
          );
        return fetchApi.widget.customApi.packageStorageGet.query(input, { signal });
      },
      storageSet: (input) => {
        assertExecuting();
        if (previewId)
          return fetchApi.customWidget.package.previewStorageSet.mutate({
            previewId,
            scope: input.scope,
            key: input.key,
            value: input.value,
          });
        return fetchApi.widget.customApi.packageStorageSet.mutate(input);
      },
    }),
    [client, previewId, subscriptionScope],
  );

  return transport;
}
