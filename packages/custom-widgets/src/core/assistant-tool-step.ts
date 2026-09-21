export const isCustomWidgetToolName = (toolName: string) => toolName.startsWith("customWidget_");

const parallelSafeCustomWidgetToolNames = new Set([
  "customWidget_getSkill",
  "customWidget_schema",
  "customWidget_getReference",
  "customWidget_getComponentCatalog",
  "customWidget_findComponents",
  "customWidget_getComponent",
  "customWidget_getComponents",
  "customWidget_getSharedProps",
  "customWidget_getExample",
  "customWidget_previewQuery",
]);

const isExclusiveCustomWidgetToolName = (toolName: string) =>
  isCustomWidgetToolName(toolName) && !parallelSafeCustomWidgetToolNames.has(toolName);
const onePerStepToolNames = new Set(["homarr_enableToolGroups", "integration_getKinds", "integration_all"]);

export const appendActiveCustomWidgetToolInstruction = (instructions: string, activeToolNames: readonly string[]) =>
  `${instructions}\n\nCurrent authoring step (authoritative), active function tools: [${activeToolNames.join(", ")}]. Provider server tools such as web_search can also be available even when absent from this function-tool list. Independent read-only discovery/reference tools and preview queries may run together. Preview creation, validation, source configuration, actions, revision, and persistence must run alone; every unlisted function tool fails. After a recoverable tool failure, apply its diagnostics and call one active repair tool immediately; do not re-derive the lifecycle or narrate before the repair call.`;

export const createCustomWidgetToolStepGate = () => {
  let currentStep: number | null = null;
  let exclusiveToolClaimed = false;
  let parallelSafeToolClaimed = false;
  let componentRepairClaimed = false;

  return {
    begin(stepNumber: number) {
      if (currentStep === stepNumber) return;
      currentStep = stepNumber;
      exclusiveToolClaimed = false;
      parallelSafeToolClaimed = false;
      componentRepairClaimed = false;
    },
    claim(toolName: string) {
      if (isExclusiveCustomWidgetToolName(toolName)) {
        if (exclusiveToolClaimed || parallelSafeToolClaimed) return false;
        exclusiveToolClaimed = true;
        return true;
      }
      if (exclusiveToolClaimed) return false;
      if (toolName === "customWidget_getComponent") {
        if (componentRepairClaimed) return false;
        componentRepairClaimed = true;
      }
      parallelSafeToolClaimed = true;
      return true;
    },
  };
};

export function selectSequentialCustomWidgetToolCalls<T extends { function: { name: string } }>(
  toolCalls: readonly T[],
) {
  let exclusiveToolSelected = false;
  let parallelSafeToolSelected = false;
  let componentRepairSelected = false;
  const selectedSingletonToolNames = new Set<string>();
  const selected: T[] = [];
  const rejected: T[] = [];

  for (const toolCall of toolCalls) {
    if (onePerStepToolNames.has(toolCall.function.name)) {
      if (selectedSingletonToolNames.has(toolCall.function.name)) {
        rejected.push(toolCall);
        continue;
      }
      selectedSingletonToolNames.add(toolCall.function.name);
    }
    if (toolCall.function.name === "customWidget_getComponent") {
      if (componentRepairSelected) {
        rejected.push(toolCall);
        continue;
      }
      componentRepairSelected = true;
    }
    if (!isExclusiveCustomWidgetToolName(toolCall.function.name) && !exclusiveToolSelected) {
      parallelSafeToolSelected = true;
      selected.push(toolCall);
      continue;
    }
    if (!isExclusiveCustomWidgetToolName(toolCall.function.name) || exclusiveToolSelected || parallelSafeToolSelected) {
      rejected.push(toolCall);
      continue;
    }
    exclusiveToolSelected = true;
    selected.push(toolCall);
  }

  return { selected, rejected };
}
