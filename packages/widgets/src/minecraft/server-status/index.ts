import { IconBrandMinecraft } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition, widgetQueryInputMatches } from "../../definition";
import { optionsBuilder } from "../../options";

export const { componentLoader, definition } = createWidgetDefinition("minecraftServerStatus", {
  supportsAdvancedFocus: false,
  icon: IconBrandMinecraft,
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      title: scope.options.title,
      domain: scope.options.domain,
      isBedrockServer: scope.options.isBedrockServer,
    }),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      title: factory.text({ defaultValue: "" }),
      domain: factory.text({ defaultValue: "hypixel.net", validate: z.string().nonempty() }),
      isBedrockServer: factory.switch({ defaultValue: false }),
    }));
  },
}).withDynamicImport(() => import("./component"));
