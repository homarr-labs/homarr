import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("dnsHole"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      usePiHoleColors: factory.switch({ defaultValue: true }),
      layout: factory.select({
        options: (["grid", "row", "column"] as const).map((value) => ({
          value,
          label: (t: (s: string) => string) => t(`widget.dnsHoleSummary.option.layout.option.${value}.label`),
        })),
        defaultValue: "grid" as const,
      }),
    }));
  },
};
