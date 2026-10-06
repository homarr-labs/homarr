const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const customWidgetStyleIntentPattern =
  /\b(?:align|black|blue|border|card|color|colour|compact|cyan|dark|dense|footer|font|gap|gray|green|grey|header|icon|layout|light|margin|orange|padding|pink|purple|red|responsive|shadow|spacing|style|teal|theme|truncate|typography|violet|visual|white|wrap|yellow)\b/iu;
const customWidgetDataContractIntentPattern =
  /\b(?:api|endpoint|field|filter|metric|parameter|query|request|response|sort)\b|\b(?:add|include|remove|show)\b[^\n]{0,50}\b(?:action|button|data|details?|items?|records?|rows?|status)\b|\b(?:show|use|display)\b[^\n]{0,30}\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:items?|records?|rows?)\b/iu;
const customWidgetSourceChangeIntentPattern =
  /\b(?:change|move|rebind|replace|switch)\b[^\n]{0,50}\b(?:authentication|credentials?|integration|instance|server|source|url)\b|\b(?:bind|connect|use)\b[^\n]{0,30}\b(?:another|different|new)\b[^\n]{0,30}\b(?:integration|instance|server|source)\b/iu;

export const hasCustomWidgetStyleOnlyFollowUpIntent = (text: string) =>
  customWidgetStyleIntentPattern.test(text) && !customWidgetDataContractIntentPattern.test(text);

export const hasExplicitCustomWidgetSourceChangeIntent = (text: string) =>
  customWidgetSourceChangeIntentPattern.test(text);

const hasSameValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => hasSameValue(value, right[index]));
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).toSorted();
  const rightKeys = Object.keys(right).toSorted();
  if (!hasSameValue(leftKeys, rightKeys)) return false;
  return leftKeys.every((key) => hasSameValue(left[key], right[key]));
};

interface CustomWidgetFollowUpEditControllerOptions {
  definitionId: string;
  preserveDataContract: boolean;
  allowSourceChanges: boolean;
  loadedDefinition?: unknown;
}

interface CustomWidgetFollowUpGuardFailure {
  error: string;
  recovery: {
    recoverable: true;
    kind:
      | "follow-up-definition-load-required"
      | "follow-up-definition-target-mismatch"
      | "follow-up-data-contract-changed"
      | "follow-up-source-binding-changed";
    requiredNextTool: "customWidget_get" | "customWidget_previewCreate";
  };
  nextStep: string;
}

const getTargetMismatchFailure = (definitionId: string): CustomWidgetFollowUpGuardFailure => ({
  error: `This follow-up must update Custom Widget '${definitionId}', not create or target another definition.`,
  recovery: {
    recoverable: true,
    kind: "follow-up-definition-target-mismatch",
    requiredNextTool: "customWidget_previewCreate",
  },
  nextStep: `Reuse the loaded definition, then call customWidget_previewCreate with definitionId '${definitionId}'.`,
});

/**
 * Keeps a contextual follow-up attached to the exact persisted widget. The
 * controller intentionally owns only turn-local safety: storage still verifies
 * preview ownership, optimistic concurrency, evidence, and update persistence.
 */
export const createCustomWidgetFollowUpEditController = ({
  definitionId,
  preserveDataContract,
  allowSourceChanges,
  loadedDefinition: initialLoadedDefinition,
}: CustomWidgetFollowUpEditControllerOptions) => {
  let loadedDefinition = isRecord(initialLoadedDefinition) ? initialLoadedDefinition : null;

  return {
    validateInput(toolName: string, input: unknown): CustomWidgetFollowUpGuardFailure | null {
      if (!isRecord(input)) return null;
      if (toolName === "customWidget_get") {
        if (input.id === definitionId) return null;
        return {
          error: `Load the persisted Custom Widget '${definitionId}' for this follow-up.`,
          recovery: {
            recoverable: true,
            kind: "follow-up-definition-load-required",
            requiredNextTool: "customWidget_get",
          },
          nextStep: `Call customWidget_get with id '${definitionId}'. Do not list or select another widget.`,
        };
      }
      if (toolName === "customWidget_createFromPreview") return getTargetMismatchFailure(definitionId);
      if (toolName !== "customWidget_previewCreate") return null;
      if (input.definitionId !== definitionId) return getTargetMismatchFailure(definitionId);
      if (!loadedDefinition) {
        return {
          error: `Load Custom Widget '${definitionId}' before previewing its follow-up edit.`,
          recovery: {
            recoverable: true,
            kind: "follow-up-definition-load-required",
            requiredNextTool: "customWidget_get",
          },
          nextStep: `Call customWidget_get with id '${definitionId}', preserve its complete definition, then preview the edit.`,
        };
      }
      const candidate = isRecord(input.definition) ? input.definition : null;
      if (!candidate) return null;
      if (!allowSourceChanges && !hasSameValue(candidate.sources, loadedDefinition.sources)) {
        return {
          error:
            "This follow-up changed the existing source or integration binding without an explicit source-change request.",
          recovery: {
            recoverable: true,
            kind: "follow-up-source-binding-changed",
            requiredNextTool: "customWidget_previewCreate",
          },
          nextStep:
            "Restore the loaded sources exactly, including integrationKind and integrationId, then preview the requested edit again.",
        };
      }
      if (
        preserveDataContract &&
        (!hasSameValue(candidate.requests, loadedDefinition.requests) ||
          !hasSameValue(candidate.options ?? {}, loadedDefinition.options ?? {}))
      ) {
        return {
          error: "A style-only follow-up must preserve the widget's requests and options.",
          recovery: {
            recoverable: true,
            kind: "follow-up-data-contract-changed",
            requiredNextTool: "customWidget_previewCreate",
          },
          nextStep: "Restore the loaded requests and options exactly, change only presentation, then preview again.",
        };
      }
      return null;
    },
    observeResult(toolName: string, output: unknown) {
      if (toolName !== "customWidget_get" || !isRecord(output) || output.id !== definitionId) return;
      if ("error" in output && output.error !== null && output.error !== undefined) return;
      loadedDefinition = output;
    },
  };
};
