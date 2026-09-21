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
  "customWidget_configurationRequestUser",
  "customWidget_createFromPreview",
  "customWidget_updateFromPreview",
]);
const customWidgetFinalizationPhaseToolNames = new Set([
  "customWidget_createFromPreview",
  "customWidget_updateFromPreview",
]);
const customWidgetDraftPhaseToolNames = new Set([
  "customWidget_getReference",
  "customWidget_getComponents",
  "customWidget_getComponent",
  "customWidget_getSharedProps",
  "customWidget_validateTemplate",
]);
const customWidgetContextPhaseToolNames = new Set([
  "integration_getKinds",
  "integration_all",
  "customWidget_list",
  "customWidget_get",
  "customWidget_getReference",
  "customWidget_findComponents",
  "customWidget_getComponents",
  "customWidget_getComponent",
  "customWidget_getSharedProps",
  "customWidget_getExample",
  "customWidget_validateTemplate",
  "customWidget_workshopSearch",
  "customWidget_workshopGet",
]);
const customWidgetWorkshopInstallPhaseToolNames = new Set([
  ...customWidgetContextPhaseToolNames,
  "customWidget_workshopInstall",
]);
const maxFocusedComponentSearchesPerPhase = 4;
const customWidgetDiscoveryToolNames = new Set([
  "customWidget_getSkill",
  "customWidget_list",
  "customWidget_get",
  "customWidget_schema",
  "customWidget_getAuthoringPrompt",
  "customWidget_getComponentCatalog",
  "customWidget_findComponents",
  "customWidget_getReference",
  "customWidget_getComponent",
  "customWidget_getComponents",
  "customWidget_getSharedProps",
  "customWidget_getExample",
  "customWidget_workshopSearch",
  "customWidget_workshopGet",
]);

const customWidgetMutationIntentPattern =
  /\b(?:add|adjust|build|change|convert|create|design|edit|fix|make|migrate|modify|remove|repair|update)\b/iu;
const customWidgetSubjectPattern = /\b(?:custom[\s-]+(?:jsx|widgets?)|homarr-custom-widget-v\d+|widgets?)\b/iu;
const customWidgetNeedPattern = /\b(?:i|we)\s+(?:need|want)\b[^\n]{0,60}\bwidgets?\s+(?:for|using|with)\b/iu;
const customWidgetContinueOnlyPattern = /^\s*(?:continue|keep\s+going|proceed|go\s+on|finish|complete)\b/iu;
const customWidgetContextualSubjectPattern = /\b(?:it|that|this)(?:\s+(?:one|widget))?\b/iu;
const customWidgetFreshCreationPattern =
  /\b(?:build|create|design|make)\b[^\n]{0,100}\bwidgets?\b|\b(?:add|start)\b[^\n]{0,40}\b(?:another|new)\b[^\n]{0,40}\bwidgets?\b|\b(?:i|we)\s+(?:need|want)\b[^\n]{0,80}\bwidgets?\b/iu;
const customWidgetFollowUpMutationPattern = /\b(?:add|adjust|change|edit|fix|modify|remove|repair|update)\b/iu;
const customWidgetExplicitFollowUpPattern =
  /\b(?:add\b[^\n]{0,60}\bto|remove\b[^\n]{0,60}\bfrom|adjust|change|edit|fix|modify|repair|update)\b[^\n]{0,80}\b(?:custom[\s-]+widgets?|widgets?)\b/iu;
const customWidgetContextualMakePattern = /\bmake\s+(?:it|that\s+one)\b/iu;
const customWidgetConfigurationResumePattern =
  /^\s*(?:(?:i(?:'ve|\s+have)?\s+)?(?:completed|configured|finished)|done\b|(?:the\s+)?(?:configuration|setup)\s+is\s+(?:complete|done))\b/iu;

export interface CustomWidgetToolStep {
  toolResults: readonly { toolName: string; output: unknown }[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasMeaningfulError = (output: Record<string, unknown>) =>
  "error" in output && output.error !== null && output.error !== undefined && output.error !== false;

export const hasCustomWidgetAuthoringContinuationIntent = (text: string, hasRecentLifecycleContext = false) => {
  if (customWidgetContinueOnlyPattern.test(text) || customWidgetNeedPattern.test(text)) return true;
  if (
    hasRecentLifecycleContext &&
    customWidgetContextualSubjectPattern.test(text) &&
    customWidgetMutationIntentPattern.test(text)
  ) {
    return true;
  }
  return customWidgetSubjectPattern.test(text) && customWidgetMutationIntentPattern.test(text);
};

export const hasCustomWidgetAuthoringLifecycleResumeIntent = (text: string, hasRecentLifecycleContext = false) => {
  if (!hasRecentLifecycleContext || customWidgetFreshCreationPattern.test(text)) return false;
  if (customWidgetContinueOnlyPattern.test(text) || customWidgetConfigurationResumePattern.test(text)) return true;
  if (customWidgetContextualMakePattern.test(text)) return true;
  if (customWidgetContextualSubjectPattern.test(text) && customWidgetFollowUpMutationPattern.test(text)) {
    return true;
  }
  return customWidgetExplicitFollowUpPattern.test(text);
};

export const isSuccessfulCustomWidgetAuthoringAdvance = (toolName: string, output: unknown) => {
  if (!isRecord(output) || hasMeaningfulError(output)) return false;
  if (customWidgetDiscoveryToolNames.has(toolName)) return true;
  if (toolName === "customWidget_validateTemplate") return output.valid === true;
  if (toolName === "customWidget_previewCreate" || toolName === "customWidget_previewReviseTemplate") {
    return output.success === true || isRecord(output.previewSession);
  }
  if (toolName === "customWidget_previewQuery" || toolName === "customWidget_previewAction") {
    return output.ok === true;
  }
  if (toolName === "customWidget_configurationRequestUser") return output.status === "completed";
  return false;
};

const recoverablePreviewErrorPattern =
  /(?:definition is invalid|invalid input|provide template|unrecognized key|unknown widget option|sources\.|requests\.|options\.|template)/iu;
const terminalPreviewErrorPattern =
  /(?:closed|connection|credential|forbidden|model|not found|permission denied|provider|session|timed? out|unavailable)/iu;

export const isRecoverableCustomWidgetAuthoringFailure = (toolName: string, output: unknown) => {
  if (!isRecord(output)) return false;
  const recovery = isRecord(output.recovery) ? output.recovery : null;
  if (recovery?.recoverable === true) return true;
  if (toolName === "customWidget_previewQuery" || toolName === "customWidget_previewAction") {
    if (output.status === 401) return true;
    return typeof output.error === "string" && /(?:authenticat|credential|secret|unauthori[sz]ed)/iu.test(output.error);
  }
  if (toolName === "customWidget_validateTemplate") return output.valid === false;
  if (
    toolName !== "customWidget_previewCreate" &&
    toolName !== "customWidget_previewReviseTemplate" &&
    toolName !== "customWidget_createFromPreview" &&
    toolName !== "customWidget_updateFromPreview"
  ) {
    return false;
  }
  if (typeof output.error !== "string") return false;
  if (terminalPreviewErrorPattern.test(output.error)) return false;
  if (toolName === "customWidget_createFromPreview" || toolName === "customWidget_updateFromPreview") {
    return /test every final preview (?:query|action)/iu.test(output.error);
  }
  return recoverablePreviewErrorPattern.test(output.error);
};

const getPreviewRequestIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.requestId !== "string") return [];
    return [entry.requestId];
  });
};

const getPreviewSourceConfigurationIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.sourceId !== "string") return [];
    return [entry.sourceId];
  });
};

const hasCompletedPreviewSourceConfiguration = (
  sessionId: string,
  sourceId: string,
  laterSteps: readonly CustomWidgetToolStep[],
) =>
  laterSteps.some((step) =>
    step.toolResults.some((result) => {
      if (result.toolName !== "customWidget_configurationRequestUser") return false;
      const output = isRecord(result.output) ? result.output : null;
      return output?.status === "completed" && output.previewSessionId === sessionId && output.sourceId === sourceId;
    }),
  );

const hasPendingPreviewSourceConfiguration = (laterSteps: readonly CustomWidgetToolStep[]) => {
  const statusByRequestId = new Map<string, unknown>();
  for (const result of laterSteps.flatMap((step) => step.toolResults)) {
    if (result.toolName !== "customWidget_configurationRequestUser") continue;
    const output = isRecord(result.output) ? result.output : null;
    if (typeof output?.requestId !== "string") continue;
    statusByRequestId.set(output.requestId, output.status);
  }
  return [...statusByRequestId.values()].some((status) => status === "pending");
};

const isPreviewAuthenticationFailure = (output: Record<string, unknown>) => {
  if (output.status === 401) return true;
  return typeof output.error === "string" && /(?:authenticat|credential|secret|unauthori[sz]ed)/iu.test(output.error);
};

const isPreviewSourceConfigurationFailure = (output: Record<string, unknown>) =>
  isPreviewAuthenticationFailure(output) || output.requiredNextTool === "customWidget_configurationRequestUser";

const getLatestPreviewEvidenceFailures = (laterSteps: readonly CustomWidgetToolStep[]) => {
  const indexedResults = laterSteps.flatMap((step) => step.toolResults).map((result, index) => ({ result, index }));
  const latestEvidenceByRequest = new Map<string, { index: number; output: Record<string, unknown> }>();
  for (const { result, index } of indexedResults) {
    if (result.toolName !== "customWidget_previewQuery" && result.toolName !== "customWidget_previewAction") continue;
    const output = isRecord(result.output) ? result.output : null;
    if (!output) continue;
    const sessionId = typeof output.sessionId === "string" ? output.sessionId : "unknown-session";
    const requestId = typeof output.requestId === "string" ? output.requestId : `unknown-request-${index}`;
    latestEvidenceByRequest.set(`${result.toolName}:${sessionId}:${requestId}`, {
      index,
      output,
    });
  }

  return [...latestEvidenceByRequest.values()].filter(({ index, output }) => {
    if (output.ok === true) return false;
    if (!isPreviewSourceConfigurationFailure(output)) return true;
    return !indexedResults.slice(index + 1).some(({ result }) => {
      if (result.toolName !== "customWidget_configurationRequestUser") return false;
      const configuration = isRecord(result.output) ? result.output : null;
      if (configuration?.status !== "completed") return false;
      if (typeof output.sessionId === "string" && configuration.previewSessionId !== output.sessionId) return false;
      if (typeof output.sourceId === "string" && configuration.sourceId !== output.sourceId) return false;
      return true;
    });
  });
};

const isSuccessfulWorkshopGet = (output: unknown) => {
  if (!isRecord(output)) return false;
  return isRecord(output.widget) && Array.isArray(output.sourceSetup);
};

const isSuccessfulWorkshopInstall = (output: unknown) => {
  if (!isRecord(output)) return false;
  return output.status === "installed" && typeof output.definitionId === "string";
};

const getPreviewPersistenceTool = (output: unknown) => {
  if (isRecord(output) && output.persistenceTool === "customWidget_updateFromPreview") {
    return "customWidget_updateFromPreview";
  }
  return "customWidget_createFromPreview";
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
  let componentLookupFailed = false;
  for (let stepIndex = steps.length - 1; stepIndex >= 0; stepIndex -= 1) {
    const step = steps[stepIndex];
    if (!step) continue;
    const componentResults = step.toolResults.filter((result) => result.toolName === "customWidget_getComponent");
    if (componentResults.length > 0) {
      hasPostValidationComponentRepair = true;
      componentLookupFailed ||= componentResults.some((result) => {
        const output = isRecord(result.output) ? result.output : null;
        const recovery = isRecord(output?.recovery) ? output.recovery : null;
        return recovery?.kind === "component-not-found";
      });
    }
    const persistenceResults = step.toolResults.filter(
      (result) =>
        result.toolName === "customWidget_createFromPreview" || result.toolName === "customWidget_updateFromPreview",
    );
    if (persistenceResults.length > 0) {
      const succeeded = persistenceResults.every((result) => {
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
    const workshopInstallResults = step.toolResults.filter(
      (result) => result.toolName === "customWidget_workshopInstall",
    );
    if (workshopInstallResults.length > 0) {
      const succeeded = workshopInstallResults.every((result) => isSuccessfulWorkshopInstall(result.output));
      if (!succeeded) {
        return availableToolNames.filter((toolName) => customWidgetWorkshopInstallPhaseToolNames.has(toolName));
      }
      discoveryStartStep = stepIndex + 1;
      break;
    }
    const workshopGetResults = step.toolResults.filter((result) => result.toolName === "customWidget_workshopGet");
    if (workshopGetResults.length > 0) {
      const succeeded = workshopGetResults.every((result) => isSuccessfulWorkshopGet(result.output));
      if (succeeded) {
        return availableToolNames.filter((toolName) => customWidgetWorkshopInstallPhaseToolNames.has(toolName));
      }
      return availableToolNames.filter((toolName) => customWidgetContextPhaseToolNames.has(toolName));
    }
    const previewResults = step.toolResults.filter(
      (result) =>
        result.toolName === "customWidget_previewCreate" || result.toolName === "customWidget_previewReviseTemplate",
    );
    if (previewResults.length > 0) {
      const unchanged = previewResults.every((result) => {
        const output = isRecord(result.output) ? result.output : null;
        return output?.unchanged === true && output?.preservesPreviewEvidence === true;
      });
      if (unchanged) continue;
      const succeeded = previewResults.every((result) => {
        const output = isRecord(result.output) ? result.output : null;
        return output?.success === true || isRecord(output?.previewSession);
      });
      if (succeeded) {
        const laterSteps = steps.slice(stepIndex + 1);
        if (hasPendingPreviewSourceConfiguration(laterSteps)) {
          return availableToolNames.filter((toolName) => toolName === "customWidget_configurationRequestUser");
        }
        const evidenceFailures = getLatestPreviewEvidenceFailures(laterSteps);
        if (evidenceFailures.some(({ output }) => isPreviewSourceConfigurationFailure(output))) {
          return availableToolNames.filter((toolName) => toolName === "customWidget_configurationRequestUser");
        }
        if (evidenceFailures.length > 0) return [];
        const sourceConfigurationComplete = previewResults.every((result) => {
          const output = isRecord(result.output) ? result.output : null;
          const sourceIds = getPreviewSourceConfigurationIds(output?.sourceConfigurations);
          if (sourceIds.length === 0) return true;
          const previewSession = isRecord(output?.previewSession) ? output.previewSession : null;
          const sessionId = typeof previewSession?.id === "string" ? previewSession.id : null;
          if (sessionId === null) return false;
          return sourceIds.every((sourceId) => hasCompletedPreviewSourceConfiguration(sessionId, sourceId, laterSteps));
        });
        if (!sourceConfigurationComplete) {
          return availableToolNames.filter((toolName) => toolName === "customWidget_configurationRequestUser");
        }
        const evidenceComplete = previewResults.every((result) =>
          hasCompletePreviewEvidence(result.output, laterSteps),
        );
        if (evidenceComplete) {
          const persistenceToolNames = new Set<string>(
            previewResults.map((result) => getPreviewPersistenceTool(result.output)),
          );
          return availableToolNames.filter(
            (toolName) => customWidgetFinalizationPhaseToolNames.has(toolName) && persistenceToolNames.has(toolName),
          );
        }
        return availableToolNames.filter((toolName) => customWidgetEvidencePhaseToolNames.has(toolName));
      }
      if (previewResults.some((result) => result.toolName === "customWidget_previewReviseTemplate")) {
        return availableToolNames.filter((toolName) => customWidgetValidationPhaseToolNames.has(toolName));
      }
      return availableToolNames.filter((toolName) => customWidgetReferenceAndValidationToolNames.has(toolName));
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
      const validationOutcomes = validationResults.map((result) => {
        const output = isRecord(result.output) ? result.output : null;
        return output?.valid === true;
      });
      if (validationOutcomes.some(Boolean) && validationOutcomes.some((valid) => !valid)) return null;
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
      const needsComponentRepair = validationResults.some((result) => {
        const output = isRecord(result.output) ? result.output : null;
        if (!Array.isArray(output?.diagnostics)) return false;
        return output.diagnostics.some(
          (diagnostic) =>
            isRecord(diagnostic) &&
            typeof diagnostic.message === "string" &&
            /UNKNOWN_(?:COMPONENT|MANTINE_PROP)/u.test(diagnostic.message),
        );
      });
      return availableToolNames.filter(
        (toolName) =>
          toolName === "customWidget_validateTemplate" ||
          (needsComponentRepair && !componentLookupFailed && toolName === "customWidget_getComponent") ||
          (needsComponentRepair && componentLookupFailed && toolName === "customWidget_findComponents") ||
          (needsComponentRepair && componentLookupFailed && toolName === "customWidget_getComponents"),
      );
    }
  }
  if (hasPreviewEvidence) {
    return availableToolNames.filter((toolName) => customWidgetEvidencePhaseToolNames.has(toolName));
  }
  const discoveryResults = steps.slice(discoveryStartStep).flatMap((step) => step.toolResults);
  const repeatedContextToolNames = new Set(
    discoveryResults.flatMap((result) => {
      const output = isRecord(result.output) ? result.output : null;
      return output?.contextAlreadyLoaded === true ? [result.toolName] : [];
    }),
  );
  const getAvailablePhaseTools = (phaseToolNames: ReadonlySet<string>) =>
    availableToolNames.filter((toolName) => phaseToolNames.has(toolName) && !repeatedContextToolNames.has(toolName));
  const focusedSearches = discoveryResults.filter((result) => result.toolName === "customWidget_findComponents").length;
  const contextRetrievalComplete = discoveryResults.some((result) => {
    const output = isRecord(result.output) ? result.output : null;
    return output?.phaseComplete === true;
  });
  if (contextRetrievalComplete) {
    return getAvailablePhaseTools(customWidgetValidationPhaseToolNames);
  }
  const selectedDocumentationLoaded = discoveryResults.some((result) => {
    if (result.toolName !== "customWidget_getComponents") return false;
    const output = isRecord(result.output) ? result.output : null;
    return Array.isArray(output?.components) && output.components.length > 0;
  });
  if (selectedDocumentationLoaded) {
    return getAvailablePhaseTools(customWidgetReferenceAndValidationToolNames);
  }
  if (focusedSearches >= maxFocusedComponentSearchesPerPhase) {
    return getAvailablePhaseTools(customWidgetDraftPhaseToolNames);
  }
  const skillLoaded = steps.some((step) =>
    step.toolResults.some((result) => result.toolName === "customWidget_getSkill"),
  );
  if (skillLoaded) {
    return getAvailablePhaseTools(customWidgetContextPhaseToolNames);
  }
  return null;
};
