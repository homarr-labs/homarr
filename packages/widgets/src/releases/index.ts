import { IconRocket } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { getWidgetIntegrationConfig, releaseProviderKinds } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";
import {
  newReleaseWithinOptions,
  releaseLayouts,
  releaseSectionKeys,
  releaseSummaryModes,
  staleReleaseWithinOptions,
} from "./release-options";

export const { definition, componentLoader } = createWidgetDefinition("releases", {
  deferUntilVisible: true,
  supportsAdvancedFocus: true,
  icon: IconRocket,
  queryKeys: [[["widget", "releases", "getLatest"]], [["widget", "releases", "getServiceVersions"]]],
  queryMatcher: (query, scope) => {
    if (query.path.at(-1) === "getServiceVersions") return matchesWidgetRuntimeQuery(query, scope);
    return widgetQueryInputMatches(query.input, { itemId: scope.itemId });
  },
  refetchInterval: null,
  ...getWidgetIntegrationConfig("releases"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      layout: factory.select({
        defaultValue: "comfortable",
        withDescription: true,
        options: releaseLayouts.map((value) => ({
          value,
          label: (t) => t(`widget.releases.option.layout.option.${value}`),
        })),
      }),
      summary: factory.select({
        defaultValue: "count",
        withDescription: true,
        options: releaseSummaryModes.map((value) => ({
          value,
          label: (t) => t(`widget.releases.option.summary.option.${value}`),
        })),
      }),
      groupReleases: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      sections: factory.multiSelect({
        defaultValue: [...releaseSectionKeys],
        withDescription: true,
        options: releaseSectionKeys.map((value) => ({
          value,
          label: (t) => t(`widget.releases.section.${value}.label`),
        })),
      }),
      collapsedSections: factory.multiSelect({
        defaultValue: ["quiet"],
        withDescription: true,
        options: releaseSectionKeys.map((value) => ({
          value,
          label: (t) => t(`widget.releases.section.${value}.label`),
        })),
      }),
      newReleaseWithin: factory.select({
        defaultValue: "1w",
        withDescription: true,
        options: newReleaseWithinOptions.map((value) => ({
          value,
          label: (t) => t(`widget.releases.option.newReleaseWithin.option.${value}`),
        })),
      }),
      staleReleaseWithin: factory.select({
        defaultValue: "6M",
        withDescription: true,
        options: staleReleaseWithinOptions.map((value) => ({
          value,
          label: (t) => t(`widget.releases.option.staleReleaseWithin.option.${value}`),
        })),
      }),
      showChangelogPreview: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      hiddenDockerSuggestions: factory.internal({ defaultValue: [] as string[] }),
      repositories: factory.multiReleasesRepositories({
        defaultValue: [
          {
            id: createId(),
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
            excludePrereleases: z.boolean().optional(),
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
}).withDynamicImport(() => import("./component"));
