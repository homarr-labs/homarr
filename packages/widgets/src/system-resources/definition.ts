import { optionsBuilder } from "../options";

const labelDisplayModeKeys = ["textWithIcon", "text", "icon", "hidden"] as const;

export const serverDefinition = {
  supportedIntegrations: ["dashDot", "openmediavault", "truenas", "unraid", "glances"] as const,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      hasShadow: factory.switch({ defaultValue: true }),
      visibleCharts: factory.multiSelect({
        options: (["cpu", "memory", "gpu", "network"] as const).map((key) => ({
          value: key,
          label: (t: (s: string) => string) => t(`widget.systemResources.option.visibleCharts.option.${key}`),
        })),
        defaultValue: ["cpu", "memory", "network"],
        withDescription: true,
      }),
      labelDisplayMode: factory.select({
        options: labelDisplayModeKeys.map((key) => ({
          value: key,
          label: (t: (s: string) => string) => t(`widget.systemResources.option.labelDisplayMode.option.${key}`),
        })),
        defaultValue: "textWithIcon" as const,
      }),
    }));
  },
};
