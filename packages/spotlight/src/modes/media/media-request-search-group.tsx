import { Group, Image, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconMovie, IconSearch } from "@tabler/icons-react";
import { keepPreviousData } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getIntegrationName } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

import { createGroup } from "../../lib/group";
import { mediaRequestSearchScopeAtom } from "../../spotlight-store";
import { useMediaRequestSearchInteraction } from "../external/search-engines-search-group";

type MediaRequestSearchResult = RouterOutputs["integration"]["searchMediaRequests"][number];

type MediaRequestSearchOption =
  | {
      key: string;
      kind: "disabled" | "hint";
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
  Component(option) {
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
    return (
      <Group w="100%" wrap="nowrap" align="center" px="md" py="xs">
        {result.image ? (
          <Image src={result.image} w={35} h={50} fit="cover" radius="md" />
        ) : (
          <IconSearch stroke={1.5} size={35} />
        )}
        <Stack gap={2}>
          <Text>{result.name}</Text>
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
    const tMedia = useScopedI18n("search.mode.media");
    const scope = useAtomValue(mediaRequestSearchScopeAtom);
    const [debouncedQuery] = useDebouncedValue(query.trim(), 150);
    const targetsQuery = clientApi.integration.mediaRequestSearchTargets.useQuery();

    const scopedTargets = (targetsQuery.data ?? []).filter((target) =>
      scope.integrationIds ? scope.integrationIds.includes(target.id) : true,
    );
    const hasScopedTargets = scopedTargets.length > 0;
    const shouldSearch = debouncedQuery.length > 0 && hasScopedTargets;
    const integrationIds = scope.integrationIds ? scopedTargets.map((target) => target.id) : undefined;

    const resultsQuery = clientApi.integration.searchMediaRequests.useQuery(
      { query: debouncedQuery, integrationIds },
      {
        enabled: shouldSearch,
        placeholderData: keepPreviousData,
        select: (data) => data.slice(0, 10),
      },
    );

    const isLoading = targetsQuery.isLoading || (shouldSearch && resultsQuery.isLoading);
    const isError = targetsQuery.isError || (shouldSearch && resultsQuery.isError);

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
          },
        ],
      };
    }

    if (debouncedQuery.length === 0) {
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
