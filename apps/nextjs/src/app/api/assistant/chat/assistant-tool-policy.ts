import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

const mutationApprovalInstruction =
  "This action is protected by Homarr's native approval UI. When the user's request and the required inputs are clear, call this tool immediately. The tool call only requests approval; it does not execute until the user selects Approve and run. Never ask for confirmation in prose before calling it.";

export const customWidgetAssistantInstructions = `

Custom Widget authoring rules:
- For every request to create, repair, validate, preview, or explain a Custom JSX widget, use the complete installed skill and JSON Schema from the trusted Custom Widget authoring context when they are preloaded below; do not call customWidget_getSkill or customWidget_schema in that case. When they are not preloaded, first call customWidget_getSkill, whose response contains the complete installed skill and all references, then call customWidget_schema. Follow those resources as authoritative. Next call the compact customWidget_getComponentCatalog for the installed release. Fetch only the relevant named component documentation with customWidget_getComponent and, when its interaction pattern applies, one named example with customWidget_getExample before authoring. Component results contain only component-specific props; if the design needs shared props such as spacing or color, collect their names from the catalog and call customWidget_getSharedProps once with only those names.
- Use templateLines for multiline JSX tool input. Do not send a heavily escaped multiline template string when templateLines is accepted.
- Never skip the authoring lifecycle: customWidget_validate, repair all issues, customWidget_previewCreate, then customWidget_previewQuery for every query listed by the preview. Inspect the real status and returned data shape, correct request paths and template bindings, and repeat validation and preview after changes. Call customWidget_create only after the definition and its preview queries succeed.
- A preview session is not evidence that its API queries work. Never claim live data works until customWidget_previewQuery returned it. Use the returned previewPath when the user should inspect the rendered result.
- After creating a widget, include the returned managementPath as a Markdown link so the user can open and edit the exact widget in Homarr.
- If the user must choose what happens next, such as whether to add the created widget to a board or leave it unplaced, call ask_user with explicit choices. Never end a custom-widget response with a prose question that expects a typed answer. Open-ended conversation and purely rhetorical questions do not require ask_user; state optional next steps declaratively instead of asking about them.`;

export const withAssistantToolPolicy = (description: string | undefined, requiresApproval: boolean) => {
  if (!requiresApproval) return description;
  return description ? `${description}\n\n${mutationApprovalInstruction}` : mutationApprovalInstruction;
};

export const getForcedAssistantToolName = (messages: UIMessage[]) => {
  const latestMessage = messages.at(-1);
  if (latestMessage?.role !== "assistant") return undefined;

  const latestToolPart = latestMessage.parts.toReversed().find((part) => isToolUIPart(part));
  if (latestToolPart === undefined || latestToolPart.state !== "output-available") return undefined;

  const nextToolByHumanTool = {
    configure_app: "app_create",
    configure_board_settings: "board_savePartialBoardSettings",
    configure_widget: "board_addItem",
  } as const;
  const toolName = getToolName(latestToolPart);
  if (
    (toolName === "configure_board_settings" || toolName === "configure_widget") &&
    typeof latestToolPart.output === "object" &&
    latestToolPart.output !== null &&
    "cancelled" in latestToolPart.output &&
    latestToolPart.output.cancelled === true
  ) {
    return undefined;
  }
  return toolName in nextToolByHumanTool
    ? nextToolByHumanTool[toolName as keyof typeof nextToolByHumanTool]
    : undefined;
};

type AssistantToolExecutionStep = {
  toolResults: readonly {
    toolName: string;
    output: unknown;
  }[];
};

type AssistantToolResponseMessage = {
  role: string;
  content: unknown;
};

const isSuccessfulCustomWidgetCreateOutput = (output: unknown) =>
  typeof output === "object" &&
  output !== null &&
  "id" in output &&
  typeof output.id === "string" &&
  output.id.length > 0 &&
  "managementPath" in output &&
  typeof output.managementPath === "string" &&
  output.managementPath.length > 0 &&
  (!("error" in output) || output.error === undefined);

const getCustomWidgetCreateOutputFromResponseMessages = (responseMessages: readonly AssistantToolResponseMessage[]) => {
  for (const message of responseMessages.toReversed()) {
    if (message.role !== "tool" || !Array.isArray(message.content)) continue;
    for (const part of message.content.toReversed()) {
      if (
        typeof part !== "object" ||
        part === null ||
        !("type" in part) ||
        part.type !== "tool-result" ||
        !("toolName" in part) ||
        part.toolName !== "customWidget_create" ||
        !("output" in part)
      ) {
        continue;
      }
      const output = part.output;
      if (
        typeof output === "object" &&
        output !== null &&
        "type" in output &&
        output.type === "json" &&
        "value" in output
      ) {
        return output.value;
      }
      return output;
    }
  }
  return undefined;
};

export const getRequiredAssistantToolNames = (
  messages: UIMessage[],
  completedSteps: readonly AssistantToolExecutionStep[] = [],
  responseMessages: readonly AssistantToolResponseMessage[] = [],
) => {
  // prepareStep receives every completed server-side step in the current stream. Prefer its most
  // recent result so a customWidget_create performed mid-run is handled before the model can fall
  // back to a prose question. Once another step has completed, the creation is no longer the
  // immediately preceding action and must not keep forcing the same follow-up.
  if (completedSteps.length > 0) {
    const latestCreateResult = completedSteps
      .at(-1)
      ?.toolResults.toReversed()
      .find((result) => result.toolName === "customWidget_create");
    return latestCreateResult && isSuccessfulCustomWidgetCreateOutput(latestCreateResult.output)
      ? (["configure_widget", "ask_user"] as const)
      : [];
  }

  // Approval-gated tools execute immediately before the first model step of the follow-up request.
  // AI SDK exposes those fresh outputs through responseMessages, not completedSteps or the incoming
  // UI history, so inspect them before falling back to the persisted UI part.
  const responseCreateOutput = getCustomWidgetCreateOutputFromResponseMessages(responseMessages);
  if (responseCreateOutput !== undefined) {
    return isSuccessfulCustomWidgetCreateOutput(responseCreateOutput)
      ? (["configure_widget", "ask_user"] as const)
      : [];
  }

  // Approval-gated tools finish in a later HTTP request. At step zero their result is already in
  // the incoming UI history when the client has already received it.
  const latestMessage = messages.at(-1);
  if (latestMessage?.role !== "assistant") return [];
  const latestToolPart = latestMessage.parts.toReversed().find((part) => isToolUIPart(part));
  if (
    latestToolPart === undefined ||
    latestToolPart.state !== "output-available" ||
    getToolName(latestToolPart) !== "customWidget_create"
  ) {
    return [];
  }
  if (!isSuccessfulCustomWidgetCreateOutput(latestToolPart.output)) return [];

  // A successful definition creation always has one structured follow-up: place the widget when
  // a target is already known, or ask whether it should remain unplaced. Requiring one of these
  // tools prevents the model from falling back to a prose "Want me to add it?" question.
  return ["configure_widget", "ask_user"] as const;
};
