import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: ["mock", "emby", "jellyfin", "plex"] as const,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      layout: factory.select({
        defaultValue: "backdrop" as const,
        options: [
          {
            value: "backdrop",
            label: (t: (s: string) => string) => t("widget.mediaReleases.option.layout.option.backdrop.label"),
          },
          {
            value: "poster",
            label: (t: (s: string) => string) => t("widget.mediaReleases.option.layout.option.poster.label"),
          },
        ] as const,
      }),
      showDescriptionTooltip: factory.switch({ defaultValue: true }),
      showType: factory.switch({ defaultValue: true }),
      showSource: factory.switch({ defaultValue: true }),
    }));
  },
};
