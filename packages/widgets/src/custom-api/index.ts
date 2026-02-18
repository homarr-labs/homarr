import { IconWorldWww } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("customApi", {
  icon: IconWorldWww,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      icon: factory.text({
        defaultValue: "",
      }),
      iconCSS: factory.text({
        defaultValue: "",
        withDescription: true,
      }),
      url: factory.text({
        defaultValue: "https://api.ipify.org?format=json",
        validate: z.string().url(),
      }),
      method: factory.select({
        options: (["get", "post"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.customApi.option.method.option.${value}.label`),
        })),
        defaultValue: "get",
      }),
      headers: factory.multiText({
        defaultValue: [],
        withDescription: true,
        validate: z.string().min(1),
      }),
      filter: factory.text({
        defaultValue: "ip",
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
