import { Group, Stack, Text } from "@mantine/core";
import { IconMovie } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useI18n } from "@homarr/translation/client";

import { createGroup } from "../../lib/group";
import { useRemoteQuery } from "../../lib/remote-query";

type MediaFallbackOption = {
  key: string;
  label: string;
  description: string;
  query: string;
  unavailable?: boolean;
};

/** Discovers whether media search is usable, but intentionally never performs a media search. */
export const mediaFallbackGroup = createGroup<MediaFallbackOption>({
  keyPath: "key",
  title: (t) => t("search.modePicker.continueWith"),
  source: { kind: "fallback" },
  Component(option) {
    return (
      <Group w="100%" wrap="nowrap" align="center" px="md" py="xs" opacity={option.unavailable ? 0.5 : 1}>
        <IconMovie stroke={1.5} />
        <Stack gap={0}>
          <Text>{option.label}</Text>
          <Text size="xs" c="dimmed">
            {option.description}
          </Text>
        </Stack>
      </Group>
    );
  },
  useInteraction(option) {
    if (option.unavailable) return { type: "none" };
    return { type: "mode", mode: "media", query: option.query };
  },
  useQueryOptions(query) {
    const t = useI18n();
    const remoteQuery = useRemoteQuery(query, "media");
    const { data: session, status } = useSession();
    const canDiscoverTargets = remoteQuery.enabled && Boolean(session?.user);
    const targets = clientApi.integration.mediaRequestSearchTargets.useQuery(undefined, {
      enabled: canDiscoverTargets,
      staleTime: 60_000,
    });

    if (!remoteQuery.enabled) return { data: [], isLoading: false, isError: false };
    if (status === "loading") return { data: [], isLoading: true, isError: false };
    if (!session?.user) {
      return {
        data: [
          {
            key: "media-fallback",
            label: t("search.modePicker.media.fallback", { query: remoteQuery.query }),
            description: t("search.mode.media.action.search.disabled.signInRequired"),
            query: remoteQuery.query,
            unavailable: true,
          },
        ],
        isLoading: false,
        isError: false,
      };
    }
    if (!targets.data) return { data: [], isLoading: targets.isLoading, isError: targets.isError };

    const unavailable = targets.data.length === 0;
    return {
      isLoading: targets.isLoading,
      isError: targets.isError,
      data: [
        {
          key: "media-fallback",
          label: t("search.modePicker.media.fallback", { query: remoteQuery.query }),
          description: unavailable
            ? t("search.mode.media.action.search.disabled.noIntegration")
            : t("search.mode.media.action.search.description"),
          query: remoteQuery.query,
          unavailable,
        },
      ],
    };
  },
});
