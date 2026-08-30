const customWidgetPreviewPhaseToolNames = new Set([
  "customWidget_validateTemplate",
  "customWidget_previewCreate",
  "customWidget_previewReviseTemplate",
]);
const customWidgetWarningRepairPhaseToolNames = new Set([
  "customWidget_getComponent",
  ...customWidgetPreviewPhaseToolNames,
]);
const customWidgetValidationPhaseToolNames = new Set(["customWidget_validateTemplate"]);
const customWidgetReferenceAndValidationToolNames = new Set([
  "customWidget_getReference",
  "customWidget_validateTemplate",
]);
const customWidgetEvidencePhaseToolNames = new Set([
  ...customWidgetPreviewPhaseToolNames,
  "customWidget_previewQuery",
  "customWidget_previewAction",
  "customWidget_previewJournal",
  "customWidget_createFromPreview",
]);
const customWidgetFinalizationPhaseToolNames = new Set([
  "customWidget_validateTemplate",
  "customWidget_previewReviseTemplate",
  "customWidget_createFromPreview",
]);
const customWidgetDraftPhaseToolNames = new Set([
  "customWidget_getReference",
  "customWidget_getComponents",
  "customWidget_getComponent",
  "customWidget_getSharedProps",
  "customWidget_validateTemplate",
]);
const customWidgetContextPhaseToolNames = new Set([
  "customWidget_getReference",
  "customWidget_findComponents",
  "customWidget_getComponents",
  "customWidget_getComponent",
  "customWidget_getSharedProps",
  "customWidget_getExample",
  "customWidget_validateTemplate",
]);
const maxFocusedComponentSearchesPerPhase = 4;

export interface CustomWidgetToolStep {
  toolResults: readonly { toolName: string; output: unknown }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getPreviewRequestIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.requestId !== "string") return [];
    return [entry.requestId];
  });
};

const hasCompletePreviewEvidence = (previewOutput: unknown, laterSteps: readonly CustomWidgetToolStep[]) => {
  const output = isRecord(previewOutput) ? previewOutput : null;
  const previewSession = isRecord(output?.previewSession) ? output.previewSession : null;
  const sessionId = typeof previewSession?.id === "string" ? previewSession.id : null;
  if (!sessionId) return false;

  const requirements = [
    ...getPreviewRequestIds(output?.queries).map((requestId) => ({
      requestId,
      toolName: "customWidget_previewQuery",
    })),
    ...getPreviewRequestIds(output?.actions).map((requestId) => ({
      requestId,
      toolName: "customWidget_previewAction",
    })),
  ];
  const evidenceResults = laterSteps.flatMap((step) => step.toolResults);
  return requirements.every((requirement) =>
    evidenceResults.some((result) => {
      if (result.toolName !== requirement.toolName) return false;
      const evidence = isRecord(result.output) ? result.output : null;
      return evidence?.ok === true && evidence.sessionId === sessionId && evidence.requestId === requirement.requestId;
    }),
  );
};

export const getCustomWidgetPhaseToolNames = <TToolName extends string>(
  availableToolNames: readonly TToolName[],
  steps: readonly CustomWidgetToolStep[],
) => {
  let discoveryStartStep = 0;
  let hasPreviewEvidence = false;
  let hasPostValidationComponentRepair = false;
  for (let stepIndex = steps.length - 1; stepIndex >= 0; stepIndex -= 1) {
    const step = steps[stepIndex];
    if (!step) continue;
    if (step.toolResults.some((result) => result.toolName === "customWidget_getComponent")) {
      hasPostValidationComponentRepair = true;
    }
    const creationResults = step.toolResults.filter((result) => result.toolName === "customWidget_createFromPreview");
    if (creationResults.length > 0) {
      const succeeded = creationResults.every((result) => {
        const output = isRecord(result.output) ? result.output : null;
        return typeof output?.id === "string";
      });
      if (!succeeded) {
        if (hasPreviewEvidence) continue;
        return availableToolNames.filter((toolName) => customWidgetEvidencePhaseToolNames.has(toolName));
      }
      discoveryStartStep = stepIndex + 1;
      break;
    }
    const previewResults = step.toolResults.filter(
      (result) =>
        result.toolName === "customWidget_previewCreate" || result.toolName === "customWidget_previewReviseTemplate",
    );
    if (previewResults.length > 0) {
      const succeeded = previewResults.every((result) => {
        const output = isRecord(result.output) ? result.output : null;
        return output?.success === true || isRecord(output?.previewSession);
      });
      if (succeeded) {
        const evidenceComplete = previewResults.every((result) =>
          hasCompletePreviewEvidence(result.output, steps.slice(stepIndex + 1)),
        );
        if (evidenceComplete) {
          if (previewResults.some((result) => result.toolName === "customWidget_previewReviseTemplate")) {
            return availableToolNames.filter((toolName) => toolName === "customWidget_createFromPreview");
          }
          return availableToolNames.filter((toolName) => customWidgetFinalizationPhaseToolNames.has(toolName));
        }
        return availableToolNames.filter((toolName) => customWidgetEvidencePhaseToolNames.has(toolName));
      }
      if (previewResults.some((result) => result.toolName === "customWidget_previewReviseTemplate")) {
        return availableToolNames.filter((toolName) => customWidgetEvidencePhaseToolNames.has(toolName));
      }
      discoveryStartStep = stepIndex + 1;
      break;
    }
    if (
      step.toolResults.some(
        (result) =>
          result.toolName === "customWidget_previewQuery" ||
          result.toolName === "customWidget_previewAction" ||
          result.toolName === "customWidget_previewJournal",
      )
    ) {
      hasPreviewEvidence = true;
      continue;
    }
    const validationResults = step.toolResults.filter((result) => result.toolName === "customWidget_validateTemplate");
    if (validationResults.length > 0) {
      const succeeded = validationResults.every((result) => {
        const output = isRecord(result.output) ? result.output : null;
        return output?.valid === true;
      });
      if (succeeded) {
        const hasWarnings = validationResults.some((result) => {
          const output = isRecord(result.output) ? result.output : null;
          if (!Array.isArray(output?.diagnostics)) return false;
          return output.diagnostics.some((diagnostic) => isRecord(diagnostic) && diagnostic.severity === "warning");
        });
        if (hasWarnings && !hasPostValidationComponentRepair) {
          return availableToolNames.filter((toolName) => customWidgetWarningRepairPhaseToolNames.has(toolName));
        }
        return availableToolNames.filter((toolName) => customWidgetPreviewPhaseToolNames.has(toolName));
      }
      discoveryStartStep = stepIndex + 1;
      break;
    }
  }
  if (hasPreviewEvidence) {
    return availableToolNames.filter((toolName) => customWidgetEvidencePhaseToolNames.has(toolName));
  }
  const discoveryResults = steps.slice(discoveryStartStep).flatMap((step) => step.toolResults);
  const focusedSearches = discoveryResults.filter((result) => result.toolName === "customWidget_findComponents").length;
  const contextRetrievalComplete = discoveryResults.some((result) => {
    const output = isRecord(result.output) ? result.output : null;
    return output?.phaseComplete === true || output?.contextAlreadyLoaded === true;
  });
  if (contextRetrievalComplete) {
    return availableToolNames.filter((toolName) => customWidgetValidationPhaseToolNames.has(toolName));
  }
  const selectedDocumentationLoaded = discoveryResults.some((result) => {
    if (result.toolName !== "customWidget_getComponents") return false;
    const output = isRecord(result.output) ? result.output : null;
    return Array.isArray(output?.components) && output.components.length > 0;
  });
  if (selectedDocumentationLoaded) {
    return availableToolNames.filter((toolName) => customWidgetReferenceAndValidationToolNames.has(toolName));
  }
  if (focusedSearches >= maxFocusedComponentSearchesPerPhase) {
    return availableToolNames.filter((toolName) => customWidgetDraftPhaseToolNames.has(toolName));
  }
  const skillLoaded = steps.some((step) =>
    step.toolResults.some((result) => result.toolName === "customWidget_getSkill"),
  );
  if (skillLoaded) {
    return availableToolNames.filter((toolName) => customWidgetContextPhaseToolNames.has(toolName));
  }
  return null;
};
