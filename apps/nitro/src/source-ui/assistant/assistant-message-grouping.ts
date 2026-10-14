import { groupPartByType } from "@assistant-ui/react";


export const assistantMessageGroupBy = groupPartByType({
  reasoning: ["group-agent-trace", "group-reasoning"],
  "tool-call": ["group-agent-trace", "group-tool"],
  "standalone-tool-call": [],
});
