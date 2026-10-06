import { addCustomJsxDiagnosticSourceExcerpts, validateCustomJsxTemplate } from "../jsx/analyzer";
import { normalizeCustomJsxAuthoringTemplate } from "./custom-jsx-schema";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatTemplateDigestPart = (value: number) => (value >>> 0).toString(16).padStart(8, "0");

const getTemplateFromInput = (toolName: string, input: Record<string, unknown>) => {
  const container = toolName === "customWidget_previewCreate" && isRecord(input.definition) ? input.definition : input;
  if (typeof container.template === "string") return normalizeCustomJsxAuthoringTemplate(container.template);
  if (Array.isArray(container.templateLines) && container.templateLines.every((line) => typeof line === "string")) {
    return normalizeCustomJsxAuthoringTemplate(container.templateLines.join("\n"));
  }
  return null;
};

export const getCustomWidgetTemplateDigest = (template: string) => {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < template.length; index += 1) {
    const code = template.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `tpl-${formatTemplateDigestPart(first)}${formatTemplateDigestPart(second)}`;
};

const getTemplateMetadata = (template: string) => {
  const templateDigest = getCustomWidgetTemplateDigest(template);
  return {
    templateDigest,
    validationId: `template:${templateDigest}`,
  };
};

const getRequestIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.requestId !== "string") return [];
    return [entry.requestId];
  });
};

type PreviewPersistenceTool = "customWidget_createFromPreview" | "customWidget_updateFromPreview";

const getEvidenceRecommendation = (recommendedNextTool: PreviewPersistenceTool) => ({
  evidenceComplete: true as const,
  recommendedNextTool,
  nextStep:
    "Preview evidence is complete. Persist this tested preview unless a concrete original requirement remains unmet.",
});

export const createCustomWidgetTemplateLifecycleController = () => {
  const invalidPreviewAttempts = new Map<string, number>();
  const previewRequirements = new Map<string, Set<string>>();
  const previewEvidence = new Map<string, Set<string>>();
  const previewPersistenceTools = new Map<string, PreviewPersistenceTool>();

  const markInvalidPreview = (toolName: string, input: Record<string, unknown>, output: Record<string, unknown>) => {
    const template = getTemplateFromInput(toolName, input);
    const diagnostics =
      template === null ? [] : addCustomJsxDiagnosticSourceExcerpts(template, validateCustomJsxTemplate(template));
    const fingerprintSource = JSON.stringify({ toolName, input, error: output.error, issues: output.issues });
    const failureFingerprint = getCustomWidgetTemplateDigest(fingerprintSource).replace("tpl-", "failure-");
    const invalidAttemptCount = (invalidPreviewAttempts.get(failureFingerprint) ?? 0) + 1;
    invalidPreviewAttempts.set(failureFingerprint, invalidAttemptCount);
    return {
      ...output,
      ...(template === null ? {} : getTemplateMetadata(template)),
      diagnostics,
      failureFingerprint,
      repeatedInvalidInput: invalidAttemptCount > 1,
      invalidAttemptCount,
    };
  };

  return {
    recordValidation(input: Record<string, unknown>, output: Record<string, unknown>) {
      const template = getTemplateFromInput("customWidget_validateTemplate", input);
      if (template === null) return output;
      return { ...output, ...getTemplateMetadata(template) };
    },
    recordInvalidPreview(toolName: string, input: Record<string, unknown>, output: Record<string, unknown>) {
      return markInvalidPreview(toolName, input, output);
    },
    recordPreview(output: Record<string, unknown>) {
      const session = isRecord(output.previewSession) ? output.previewSession : null;
      const sessionId = typeof session?.id === "string" ? session.id : null;
      if (sessionId === null) return output;
      const requirements = new Set([
        ...getRequestIds(output.queries).map((requestId) => `query:${requestId}`),
        ...getRequestIds(output.actions).map((requestId) => `action:${requestId}`),
      ]);
      previewRequirements.set(sessionId, requirements);
      previewEvidence.set(sessionId, new Set());
      let persistenceTool: PreviewPersistenceTool = "customWidget_createFromPreview";
      if (output.persistenceTool === "customWidget_updateFromPreview") {
        persistenceTool = "customWidget_updateFromPreview";
      }
      previewPersistenceTools.set(sessionId, persistenceTool);
      if (requirements.size === 0) return { ...output, ...getEvidenceRecommendation(persistenceTool) };
      return output;
    },
    recordEvidence(toolName: string, output: Record<string, unknown>) {
      if (output.ok !== true || typeof output.sessionId !== "string" || typeof output.requestId !== "string") {
        return output;
      }
      const kind = toolName === "customWidget_previewAction" ? "action" : "query";
      const evidence = previewEvidence.get(output.sessionId);
      const requirements = previewRequirements.get(output.sessionId);
      if (!evidence || !requirements) return output;
      evidence.add(`${kind}:${output.requestId}`);
      const complete = [...requirements].every((requirement) => evidence.has(requirement));
      if (!complete) return output;
      const persistenceTool = previewPersistenceTools.get(output.sessionId) ?? "customWidget_createFromPreview";
      return { ...output, ...getEvidenceRecommendation(persistenceTool) };
    },
  };
};
