import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("networkController"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      content: factory.select({
        options: (["wifi", "wired"] as const).map((value) => ({
          value,
          label: (t: (s: string) => string) => t(`widget.networkControllerStatus.option.content.option.${value}.label`),
        })),
        defaultValue: "wifi" as const,
      }),
    }));
  },
};
