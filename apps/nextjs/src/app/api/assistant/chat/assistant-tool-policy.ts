import { getToolName, isToolUIPart } from "ai";
import type { UIMessage } from "ai";

const mutationApprovalInstruction =
  "This action is protected by Homarr's native approval UI. When the user's request and the required inputs are clear, call this tool immediately. The tool call only requests approval; it does not execute until the user selects Approve and run. Never ask for confirmation in prose before calling it.";

export const customWidgetAssistantInstructions = `

Custom Widget authoring rules:
- Custom Widget tools are mandatory for Custom JSX work. Never answer a request to create, repair, or materially change a Custom Widget with only a manifest, JSX, instructions, or an unsupported claim that it should work.
- For every request to create, repair, validate, preview, or explain a Custom JSX widget, use the complete installed skill and JSON Schema from the trusted Custom Widget authoring context when they are preloaded below; do not call customWidget_getSkill or customWidget_schema in that case because Homarr has already loaded their complete contents into this system prompt. When they are not preloaded, first call customWidget_getSkill, whose response contains the complete installed skill and all references, then call customWidget_schema. Do not merely say that you loaded them: use their rules for the subsequent tool inputs. Follow those resources as authoritative. Next call the compact customWidget_getComponentCatalog for the installed release. Fetch only the relevant named component documentation with customWidget_getComponent and, when its interaction pattern applies, one named example with customWidget_getExample before authoring. Component results contain only component-specific props; if the design needs shared props such as spacing or color, collect their names from the catalog and call customWidget_getSharedProps once with only those names.
- Use templateLines for multiline JSX tool input. Do not send a heavily escaped multiline template string when templateLines is accepted.
- Keep each tool call within a reliable streamed size. For Pokédex or PokéAPI requests, start from the installed \`pokedex\` example returned by customWidget_getExample and improve it through validated iterations instead of generating one enormous untested JSX argument from scratch. Completeness comes from working interactions and states, not gratuitous line count.
- Honor an explicit iteration count. Each requested iteration must make a meaningful improvement and complete its own validation, preview, and required preview-query checks. Persist only the last tested preview session.
- Never skip or reorder the evidence checkpoints for the exact candidate that will be saved:
  1. Call customWidget_validate with the complete definition. Repair every reported issue and call it again until it succeeds.
  2. Call customWidget_previewCreate with that same validated definition.
  3. Call customWidget_previewQuery for every query returned by the preview. Inspect the real HTTP status and returned data shape. Test relevant simulated actions with customWidget_previewAction when the widget contains actions.
  4. If the JSX template, request definitions, sources, options, or bindings change materially at any point, the previous validation and preview evidence is stale. Start again at customWidget_validate with the complete revised definition, create a fresh preview, and retest every returned query.
  5. For a new widget, call customWidget_createFromPreview with the final tested preview session ID so the approved mutation persists that exact candidate without streaming the complete JSX again. If the user already named a target board, resolve its ID before creation and include targetBoardId; after creation call configure_widget directly and do not ask the user to choose again. Use customWidget_create only when no preview session can be reused. For an update, call customWidget_update only with the final definition whose latest validation, preview, and required query checks succeeded. Never substitute a later unvalidated version.
- A successful syntax validation proves only that the definition is valid. A preview session proves only that it can be rendered. Never claim live data works until every customWidget_previewQuery succeeded with the expected response shape. Never say the widget is created, updated, placed, or fully working unless the corresponding customWidget_create, customWidget_update, or board placement tool returned success. If a tool fails, report the specific failed checkpoint and continue repairing it when possible instead of describing the widget as done.
- Progress updates may say which checkpoint is running, but they must not claim success before the tool result exists. Use the returned previewPath when the user should inspect the rendered result.
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

const customWidgetCreateToolNames = new Set(["customWidget_create", "customWidget_createFromPreview"]);

type SuccessfulCustomWidgetCreateOutput = {
  id: string;
  managementPath: string;
  nextAction?: unknown;
  error?: undefined;
};

const isSuccessfulCustomWidgetCreateOutput = (output: unknown): output is SuccessfulCustomWidgetCreateOutput =>
  typeof output === "object" &&
  output !== null &&
  "id" in output &&
  typeof output.id === "string" &&
  output.id.length > 0 &&
  "managementPath" in output &&
  typeof output.managementPath === "string" &&
  output.managementPath.length > 0 &&
  (!("error" in output) || output.error === undefined);

const getCustomWidgetCreateFollowup = (output: unknown) => {
  if (!isSuccessfulCustomWidgetCreateOutput(output)) return [];
  const nextAction = output.nextAction;
  const hasKnownTarget =
    typeof nextAction === "object" &&
    nextAction !== null &&
    "targetBoardId" in nextAction &&
    typeof nextAction.targetBoardId === "string" &&
    nextAction.targetBoardId.length > 0;
  return hasKnownTarget ? (["configure_widget"] as const) : (["configure_widget", "ask_user"] as const);
};

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
        !customWidgetCreateToolNames.has(String(part.toolName)) ||
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
      .find((result) => customWidgetCreateToolNames.has(result.toolName));
    return latestCreateResult ? getCustomWidgetCreateFollowup(latestCreateResult.output) : [];
  }

  // Approval-gated tools execute immediately before the first model step of the follow-up request.
  // AI SDK exposes those fresh outputs through responseMessages, not completedSteps or the incoming
  // UI history, so inspect them before falling back to the persisted UI part.
  const responseCreateOutput = getCustomWidgetCreateOutputFromResponseMessages(responseMessages);
  if (responseCreateOutput !== undefined) {
    return getCustomWidgetCreateFollowup(responseCreateOutput);
  }

  // Approval-gated tools finish in a later HTTP request. At step zero their result is already in
  // the incoming UI history when the client has already received it.
  const latestMessage = messages.at(-1);
  if (latestMessage?.role !== "assistant") return [];
  const latestToolPart = latestMessage.parts.toReversed().find((part) => isToolUIPart(part));
  if (
    latestToolPart === undefined ||
    latestToolPart.state !== "output-available" ||
    !customWidgetCreateToolNames.has(getToolName(latestToolPart))
  ) {
    return [];
  }
  // A successful definition creation always has one structured follow-up: place the widget when
  // a target is already known, or ask whether it should remain unplaced. Requiring one of these
  // tools prevents the model from falling back to a prose "Want me to add it?" question.
  return getCustomWidgetCreateFollowup(latestToolPart.output);
};
