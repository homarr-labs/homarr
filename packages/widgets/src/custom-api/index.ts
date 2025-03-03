import { IconWorldWww } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("customApi", {
  icon: IconWorldWww,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      title: factory.text({
        defaultValue: "IP Address",
      }),
      icon: factory.text({
        defaultValue: "",
      }),
      url: factory.text({
        defaultValue: "https://api.ipify.org?format=json",
      }),
      filter: factory.text({
        defaultValue: "ip",
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
