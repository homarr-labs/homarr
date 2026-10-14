import { IconDeviceCctv } from "@tabler/icons-react";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "video",
  supportsAdvancedFocus: false,
  icon: IconDeviceCctv,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      feedUrl: factory.text({
        defaultValue: "",
      }),
      hasAutoPlay: factory.switch({
        withDescription: true,
      }),
      isMuted: factory.switch({
        defaultValue: true,
      }),
      hasControls: factory.switch(),
    }));
  },
} satisfies WidgetDefinition & { kind: "video" };
