import { optionsBuilder } from "../options";

export const serverDefinition = {
  createOptions(settings = { enableStatusByDefault: false, forceDisableStatus: false }) {
    return optionsBuilder.from(
      (factory) => ({
        appId: factory.app(),
        openInNewTab: factory.switch({ defaultValue: true }),
        showTitle: factory.switch({ defaultValue: true }),
        descriptionDisplayMode: factory.select({
          options: [
            {
              value: "normal",
              label: (t: (s: string) => string) => t("widget.app.option.descriptionDisplayMode.option.normal"),
            },
            {
              value: "tooltip",
              label: (t: (s: string) => string) => t("widget.app.option.descriptionDisplayMode.option.tooltip"),
            },
            {
              value: "hidden",
              label: (t: (s: string) => string) => t("widget.app.option.descriptionDisplayMode.option.hidden"),
            },
          ] as const,
          defaultValue: "hidden" as const,
          searchable: true,
          withDescription: true,
        }),
        layout: factory.select({
          options: [
            { value: "column", label: (t: (s: string) => string) => t("widget.app.option.layout.option.column") },
            {
              value: "column-reverse",
              label: (t: (s: string) => string) => t("widget.app.option.layout.option.column-reverse"),
            },
            { value: "row", label: (t: (s: string) => string) => t("widget.app.option.layout.option.row") },
            {
              value: "row-reverse",
              label: (t: (s: string) => string) => t("widget.app.option.layout.option.row-reverse"),
            },
          ] as const,
          defaultValue: "column" as const,
          searchable: true,
        }),
        pingEnabled: factory.switch({ defaultValue: settings.enableStatusByDefault }),
      }),
      {
        pingEnabled: {
          shouldHide() {
            return settings.forceDisableStatus;
          },
        },
      },
    );
  },
};
