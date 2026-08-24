import type { SearchMode } from "../../lib/mode";
import { contextSpecificFallbackSearchGroup } from "../home/context-specific-group";

export const assistantMode = {
  mode: "assistant",
  character: undefined,
  label: (t) => t("search.modePicker.assistant.label"),
  placeholder: (t) => t("search.modePicker.assistant.placeholder"),
  groups: [contextSpecificFallbackSearchGroup],
} satisfies SearchMode;
