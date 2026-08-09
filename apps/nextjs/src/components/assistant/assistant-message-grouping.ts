import { groupPartByType } from "@assistant-ui/react";

/**
 * Keep model reasoning and ordinary tool calls in one trace. Human tools and
 * other standalone tool UIs stay outside the trace so approvals and questions
 * retain the full conversation width.
 */
export const assistantMessageGroupBy = groupPartByType({
  reasoning: ["group-agent-trace", "group-reasoning"],
  "tool-call": ["group-agent-trace", "group-tool"],
  "standalone-tool-call": [],
});
