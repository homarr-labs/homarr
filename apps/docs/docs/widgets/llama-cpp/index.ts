import { WidgetDefinition } from "@site/src/types";
import { IconCpu } from "@tabler/icons-react";

export const llamacppWidget: WidgetDefinition = {
  icon: IconCpu,
  name: "llama.cpp",
  description: "Shows the health, loaded model and generation speed of a local llama.cpp llama-server.",
  path: "../../widgets/llama-cpp",
  configuration: {
    items: [
      {
        name: "Show title",
        description: "Displays the llama.cpp label and status badge at the top of the widget",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show model info",
        description: "Displays the loaded model name, quantization, context size and file size",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
      {
        name: "Show cache hit rate",
        description: "Displays the prompt cache hit rate as a percentage bar",
        values: { type: "boolean" },
        defaultValue: "yes",
      },
    ],
  },
};
