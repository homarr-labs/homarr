import type { TextStreamPart, ToolSet } from "ai";

/**
 * Message metadata is useful at stream and step boundaries. Returning it for
 * every text/reasoning/tool chunk causes the whole growing telemetry snapshot
 * to be serialized repeatedly into the SSE response.
 */
export const shouldEmitAssistantMessageMetadata = (part: Pick<TextStreamPart<ToolSet>, "type">) => {
  switch (part.type) {
    case "start":
    case "start-step":
    case "finish-step":
    case "finish":
      return true;
    default:
      return false;
  }
};
