import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocalStorage } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";

const viewedKeyPrefix = "releases.viewed.";

export const useViewedReleases = (itemId: string | undefined, repositories: { id: string }[]) => {
  const { data: session, status } = useSession();
  const [localViewed, setLocalViewed] = useLocalStorage<Record<string, string>>({
    key: "releases-viewed-versions",
    defaultValue: {},
  });
  const utils = clientApi.useUtils();
  const state = clientApi.userItemState.get.useQuery(
    { itemId: itemId ?? "" },
    {
      enabled: status === "authenticated" && Boolean(itemId),
      staleTime: 0,
      refetchInterval: false,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
    },
  );
  const { mutate } = clientApi.userItemState.set.useMutation({
    onSuccess: async (_data, input) => {
      await utils.userItemState.get.cancel({ itemId: input.itemId });
      utils.userItemState.get.setData({ itemId: input.itemId }, (previous) => ({
        ...previous,
        [input.key]: input.value,
      }));
    },
    onSettled: (_data, _error, input) => utils.userItemState.get.invalidate({ itemId: input.itemId }),
  });
  const imported = useRef(new Set<string>());

  useEffect(() => {
    if (!itemId || status !== "authenticated" || !state.isSuccess || !state.isFetchedAfterMount) return;

    for (const repository of repositories) {
      const key = `${viewedKeyPrefix}${repository.id}`;
      const importId = `${session.user.id}:${itemId}:${key}`;
      if (imported.current.has(importId) || typeof localViewed[repository.id] !== "string") continue;
      imported.current.add(importId);
      if (Object.hasOwn(state.data, key)) continue;

      mutate({ itemId, key, value: JSON.stringify(localViewed[repository.id]) });
    }
  }, [
    itemId,
    localViewed,
    mutate,
    repositories,
    session,
    state.data,
    state.isFetchedAfterMount,
    state.isSuccess,
    status,
  ]);

  const viewedVersions = useMemo(() => {
    if (status === "unauthenticated") return localViewed;
    if (status !== "authenticated") return {};

    return Object.fromEntries(
      Object.entries(state.data ?? {}).flatMap(([key, value]) => {
        if (!key.startsWith(viewedKeyPrefix)) return [];
        const version: unknown = JSON.parse(value);
        if (typeof version !== "string") return [];
        return [[key.slice(viewedKeyPrefix.length), version]];
      }),
    );
  }, [localViewed, state.data, status]);

  const markViewed = useCallback(
    (repositoryId: string, version: string) => {
      if (status === "authenticated" && itemId) {
        mutate({ itemId, key: `${viewedKeyPrefix}${repositoryId}`, value: JSON.stringify(version) });
      } else if (status === "unauthenticated") {
        setLocalViewed((previous) => ({ ...previous, [repositoryId]: version }));
      }
    },
    [itemId, mutate, setLocalViewed, status],
  );

  return { viewedVersions, markViewed };
};
