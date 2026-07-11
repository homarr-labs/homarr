import type { SearchMode } from "../../lib/mode";
import { askAiGroup } from "./ask-ai-group";

export const askAiMode = {
  modeKey: "askAi",
  character: "?",
  groups: [askAiGroup],
} satisfies SearchMode;
