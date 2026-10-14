import { IconBrandMinecraft } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { WidgetDefinition } from "../../definition";
import { widgetQueryInputMatches } from "../../definition";
import { optionsBuilder } from "../../options";

export const definition = {
  kind: "minecraftServerStatus",
  supportsAdvancedFocus: false,
  icon: IconBrandMinecraft,
  queryKey: [["widget", "minecraft", "getServerStatus"]],
  queryMatcher: ({ input }, scope) =>
    widgetQueryInputMatches(input, {
      title: scope.options.title,
      domain: scope.options.domain,
      isBedrockServer: scope.options.isBedrockServer,
    }),
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      title: factory.text({ defaultValue: "" }),
      domain: factory.text({ defaultValue: "hypixel.net", validate: z.string().nonempty() }),
      isBedrockServer: factory.switch({ defaultValue: false }),
    }));
  },
} satisfies WidgetDefinition & { kind: "minecraftServerStatus" };
