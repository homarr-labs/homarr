import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: ["dashDot", "openmediavault", "truenas", "unraid"] as const,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTemperatureIfAvailable: factory.switch({ defaultValue: true }),
      displayMode: factory.select({
        options: (["percentage", "absolute", "free"] as const).map((value) => ({
          value,
          label: (t: (s: string) => string) => t(`widget.systemDisks.option.displayMode.option.${value}.label`),
        })),
        defaultValue: "percentage" as const,
      }),
      showBackgroundBar: factory.switch({ defaultValue: true }),
    }));
  },
};
