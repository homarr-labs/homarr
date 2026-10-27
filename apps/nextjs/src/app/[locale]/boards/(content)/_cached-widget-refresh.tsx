"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getUntypedClient } from "@trpc/client";

import { clientApi } from "@homarr/api/client";
import { useBoardRestorationLifecycle } from "@homarr/boards/context";

export const CachedWidgetRefresh = ({ queryHashes }: { queryHashes: string[] }) => {
  const queryClient = useQueryClient();
  const { prepareQuerySnapshot } = useBoardRestorationLifecycle();
  const utils = clientApi.useUtils();
  const trpcClient = getUntypedClient(utils.client);

  useEffect(() => {
    prepareQuerySnapshot();
    // Start every refresh together, including widgets whose modules have not
    // mounted yet. fetchQuery joins a fetch already in progress.
    for (const hash of queryHashes) {
      const query = queryClient.getQueryCache().get(hash);
      if (!query) continue;
      const [path, details] = query.queryKey;
      if (!Array.isArray(path) || path.length === 0 || !path.every((part) => typeof part === "string")) continue;
      if (!details || typeof details !== "object" || !("type" in details) || details.type !== "query") continue;
      let input: unknown;
      if ("input" in details) input = details.input;
      query.invalidate();
      void queryClient
        .fetchQuery({
          queryKey: query.queryKey,
          staleTime: 0,
          queryFn: ({ signal }) => trpcClient.query(path.join("."), input, { signal }),
        })
        .catch(() => undefined);
    }
  }, [prepareQuerySnapshot, queryClient, queryHashes, trpcClient]);

  return null;
};
