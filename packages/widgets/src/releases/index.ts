import { IconRocket } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { getWidgetIntegrationConfig, releaseProviderKinds } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";
import { widgetQuery } from "../data";
import { normalizeReleasesRepositories, getReleasesLatestInputs, getReleasesLinkedIntegrationIds } from "./query-input";

const relativeDateSchema = z
  .string()
  .regex(/^\d+[hdwmyHDWMY]$/)
  .or(z.literal(""));

export const { definition, componentLoader } = createWidgetDefinition("releases", {
  supportsAdvancedFocus: true,
  icon: IconRocket,
  queryKeys: [[["widget", "releases", "getLatest"]], [["widget", "releases", "getServiceVersions"]]],
  queryMatcher: (query, scope) =>
    query.path.at(-1) === "getServiceVersions"
      ? matchesWidgetRuntimeQuery(query, scope)
      : widgetQueryInputMatches(query.input, { itemId: scope.itemId }),
  refetchInterval: null,
  ...getWidgetIntegrationConfig("releases"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      newReleaseWithin: factory.text({
        defaultValue: "1w",
        withDescription: true,
        validate: relativeDateSchema,
      }),
      staleReleaseWithin: factory.text({
        defaultValue: "6M",
        withDescription: true,
        validate: relativeDateSchema,
      }),
      showOnlyHighlighted: factory.switch({
        withDescription: true,
        defaultValue: true,
      }),
      showDetails: factory.switch({
        defaultValue: true,
      }),
      showOnlyIcon: factory.switch({
        defaultValue: false,
      }),
      topReleases: factory.number({
        withDescription: true,
        defaultValue: 0,
        validate: z.number().min(0),
      }),
      hiddenDockerSuggestions: factory.internal({ defaultValue: [] as string[] }),
      repositories: factory.multiReleasesRepositories({
        defaultValue: [
          {
            id: "homarr-labs-homarr",
            provider: "github" as const,
            identifier: "homarr-labs/homarr",
            name: "Homarr",
            iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/homarr.png",
            versionFilter: { prefix: "v", precision: 3 },
          },
        ],
        validate: z.array(
          z.object({
            id: z.string().default(() => createId()),
            provider: z.enum(releaseProviderKinds).optional(),
            identifier: z.string().min(1),
            name: z.string().optional(),
            versionFilter: z
              .object({
                prefix: z.string().optional(),
                precision: z.number(),
                suffix: z.string().optional(),
              })
              .optional(),
            iconUrl: z.string().optional(),
            providerUrl: z.string().url().optional(),
            integrationIds: z.array(z.string()).optional(),
          }),
        ),
      }),
    }));
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds, options, itemId, board }) => {
      const repositories = normalizeReleasesRepositories(options.repositories);
      const linked = getReleasesLinkedIntegrationIds(integrationIds, repositories);
      return {
        services: widgetQuery(
          "widget.releases.getServiceVersions",
          { integrationIds: linked },
          { enabled: linked.length > 0 },
        ),
        latest: getReleasesLatestInputs(itemId, repositories).map((input) =>
          widgetQuery("widget.releases.getLatest", { ...input, boardId: board?.id }),
        ),
      };
    },
  })
  .withDynamicImport(() => import("./component"));
