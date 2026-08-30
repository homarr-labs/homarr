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
]);

const isExclusiveCustomWidgetToolName = (toolName: string) =>
  isCustomWidgetToolName(toolName) && !parallelSafeCustomWidgetToolNames.has(toolName);

export const appendActiveCustomWidgetToolInstruction = (instructions: string, activeToolNames: readonly string[]) =>
  `${instructions}\n\nCurrent authoring step (authoritative), active tools: [${activeToolNames.join(", ")}]. Independent read-only discovery/reference tools may run together. A lifecycle tool (validation, preview, evidence, revision, or persistence) must be the only call in its step; every unlisted tool fails.`;

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
  const selected: T[] = [];
  const rejected: T[] = [];

  for (const toolCall of toolCalls) {
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
