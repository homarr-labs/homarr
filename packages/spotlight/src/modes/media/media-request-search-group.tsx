import { Badge, Group, Image, Stack, Text } from "@mantine/core";
import { IconMovie, IconSearch } from "@tabler/icons-react";
import { useAtomValue } from "jotai";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { getIntegrationName } from "@homarr/definitions";
import type { MediaAvailability } from "@homarr/integrations/types";
import { mediaAvailabilityConfiguration } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { createGroup } from "../../lib/group";
import { useRemoteQuery } from "../../lib/remote-query";
import { mediaRequestSearchScopeAtom } from "../../spotlight-store";
import { useMediaRequestSearchInteraction } from "../external/search-engines-search-group";

const availabilityLabelKeys = ["available", "partiallyAvailable", "processing", "requested", "pending"] as const;
type AvailabilityWithLabel = (typeof availabilityLabelKeys)[number];

type MediaRequestSearchResult = RouterOutputs["integration"]["searchMediaRequests"][number];

type MediaRequestSearchOption =
  | {
      key: string;
      kind: "disabled";
      label: string;
      description: string;
      unavailable: true;
    }
  | {
      key: string;
      kind: "hint";
      label: string;
      description: string;
    }
  | {
      key: string;
      kind: "result";
      result: MediaRequestSearchResult;
    };

export const mediaRequestSearchGroup = createGroup<MediaRequestSearchOption>({
  keyPath: "key",
  title: (t) => t("search.mode.media.group.title"),
  source: { kind: "remote", source: "media" },
  Component(option) {
    const tMedia = useI18n("search.mode.media");

    if (option.kind !== "result") {
      return (
        <Group w="100%" wrap="nowrap" align="center" px="md" py="xs" opacity={option.kind === "disabled" ? 0.55 : 1}>
          {option.kind === "disabled" ? <IconMovie stroke={1.5} /> : <IconSearch stroke={1.5} />}
          <Stack gap={0}>
            <Text size="sm">{option.label}</Text>
            <Text size="xs" c="gray.6">
              {option.description}
            </Text>
          </Stack>
        </Group>
      );
    }

    const { result } = option;
    const hasAvailabilityLabel =
      result.availability && (availabilityLabelKeys as readonly string[]).includes(result.availability);
    const badgeLabel = hasAvailabilityLabel
      ? tMedia(`availability.${result.availability as AvailabilityWithLabel}`)
      : undefined;
    const badgeColor = result.availability
      ? mediaAvailabilityConfiguration[result.availability as MediaAvailability]?.color
      : undefined;

    return (
      <Group w="100%" wrap="nowrap" align="center" px="md" py="xs">
        {result.image ? (
          <Image src={result.image} alt="" w={35} h={50} fit="cover" radius="md" />
        ) : (
          <IconSearch stroke={1.5} size={35} />
        )}
        <Stack gap={2} style={{ flex: 1 }}>
          <Group gap="xs" wrap="nowrap">
            <Text>{result.name}</Text>
            {badgeLabel && (
              <Badge size="xs" color={badgeColor} variant="light">
                {badgeLabel}
              </Badge>
            )}
          </Group>
          <Text c="dimmed" size="sm" lineClamp={2}>
            {result.text ?? getIntegrationName(result.integration.kind)}
          </Text>
        </Stack>
      </Group>
    );
  },
  useInteraction(option) {
    if (option.kind !== "result") {
      return {
        type: "none",
      };
    }

    return useMediaRequestSearchInteraction(option.result.integration, option.result);
  },
  useQueryOptions(query) {
    const tMedia = useI18n("search.mode.media");
    const scope = useAtomValue(mediaRequestSearchScopeAtom);
    const remoteQuery = useRemoteQuery(query, "media");
    const { data: session, status } = useSession();
    const targetsQuery = clientApi.integration.mediaRequestSearchTargets.useQuery(undefined, {
      enabled: status !== "loading" && Boolean(session?.user),
      staleTime: 60_000,
    });

    const scopedTargets = (targetsQuery.data ?? []).filter((target) =>
      scope.integrationIds ? scope.integrationIds.includes(target.id) : true,
    );
    const hasScopedTargets = scopedTargets.length > 0;
    const shouldSearch = remoteQuery.enabled && hasScopedTargets;
    const integrationIds = scope.integrationIds ? scopedTargets.map((target) => target.id) : undefined;

    const resultsQuery = clientApi.integration.searchMediaRequests.useQuery(
      { query: remoteQuery.query, integrationIds },
      {
        enabled: shouldSearch,
        select: (data) => data.slice(0, 10),
      },
    );

    const isLoading = targetsQuery.isLoading || (shouldSearch && resultsQuery.isLoading);
    const isError = targetsQuery.isError || (shouldSearch && resultsQuery.isError);

    if (status === "loading") {
      return { data: [], isLoading: true, isError: false };
    }

    if (!session?.user) {
      return {
        data: [
          {
            key: "disabled",
            kind: "disabled",
            label: tMedia("action.search.label"),
            description: tMedia("action.search.disabled.signInRequired"),
            unavailable: true,
          },
        ],
        isLoading: false,
        isError: false,
      };
    }

    if (!targetsQuery.data) {
      return {
        isLoading,
        isError,
        data: [],
      };
    }

    if (!hasScopedTargets) {
      return {
        isLoading,
        isError,
        data: [
          {
            key: "disabled",
            kind: "disabled",
            label: tMedia("action.search.label"),
            description: scope.integrationIds
              ? tMedia("action.search.disabled.scoped")
              : tMedia("action.search.disabled.noIntegration"),
            unavailable: true,
          },
        ],
      };
    }

    if (!remoteQuery.enabled) {
      return {
        isLoading,
        isError,
        data: [
          {
            key: "hint",
            kind: "hint",
            label: tMedia("action.search.label"),
            description: tMedia("action.search.description"),
          },
        ],
      };
    }

    return {
      isLoading,
      isError,
      data: (resultsQuery.data ?? []).map((result) => ({
        key: `result-${result.integration.id}-${result.type}-${result.id}`,
        kind: "result",
        result,
      })),
    };
  },
});
