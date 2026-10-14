import { IconNotes } from "@tabler/icons-react";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { defaultContent } from "./default-content";

export const definition = {
  kind: "notebook",
  icon: IconNotes,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        showToolbar: factory.switch({
          defaultValue: true,
        }),
        allowReadOnlyCheck: factory.switch({
          defaultValue: true,
        }),
        content: factory.text({
          defaultValue: defaultContent,
        }),
      }),
      {
        content: {
          shouldHide: () => true,
        },
      },
    );
  },
} satisfies WidgetDefinition & { kind: "notebook" };
