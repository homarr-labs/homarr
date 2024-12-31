import { IconBrandMinecraft } from "@tabler/icons-react";

import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { componentLoader, definition } = createWidgetDefinition("minecraftServerStatus", {
  icon: IconBrandMinecraft,
  options: optionsBuilder.from((factory) => ({
    title: factory.text({ defaultValue: "" }),
    domain: factory.text({ defaultValue: "hypixel.net", validate: z.string().nonempty() }),
    isBedrockServer: factory.switch({ defaultValue: false }),
  })),
}).withDynamicImport(() => import("./component"));
