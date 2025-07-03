import { IconWorldWww } from "@tabler/icons-react";

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
      }),
      method: factory.select({
        options: (["get", "post"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.customApi.option.method.option.${value}.label`),
        })),
        defaultValue: "get",
      }),
      headerName: factory.text({
        defaultValue: "",
      }),
      headerValue: factory.text({
        defaultValue: "",
      }),
      filter: factory.text({
        defaultValue: "ip",
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
