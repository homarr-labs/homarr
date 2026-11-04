import { serialize } from "superjson";

import { isRecord } from "@homarr/common";
import { hasCompleteCustomWidgetPreviewHandoff } from "@homarr/custom-widgets/core";

export const customWidgetPreviewQueryOutputMaxCharacters = 8_000;
export const assistantToolOutputMaxCharacters = 24_000;
const customWidgetAuthoringResourceOutputMaxCharacters = 60_000;

const customWidgetAuthoringResourceToolNames = new Set([
  "customWidget_schema",
  "customWidget_getSkill",
  "customWidget_getReference",
  "customWidget_getComponentCatalog",
  "customWidget_getComponent",
  "customWidget_getComponents",
  "customWidget_getSharedProps",
  "customWidget_getExample",
  "customWidget_get",
]);

export const getAssistantToolOutputMaxCharacters = (toolName: string) => {
  if (toolName === "customWidget_previewQuery") return customWidgetPreviewQueryOutputMaxCharacters;
  if (customWidgetAuthoringResourceToolNames.has(toolName)) return customWidgetAuthoringResourceOutputMaxCharacters;
  return assistantToolOutputMaxCharacters;
};

type AssistantToolOutputOptions = {
  toolName?: string;
  maxCharacters?: number;
  compactArray?: {
    itemProperties: readonly string[];
    outputProperty: string;
  };
};

export const getAssistantToolOutputOptions = (toolName: string): AssistantToolOutputOptions => {
  const maxCharacters = getAssistantToolOutputMaxCharacters(toolName);
  if (toolName === "board_getAllBoards") {
    return {
      toolName,
      maxCharacters,
      compactArray: {
        itemProperties: ["id", "name"],
        outputProperty: "boards",
      },
    };
  }
  return { toolName, maxCharacters };
};

const pickOutputProperties = (record: Record<string, unknown>, properties: readonly string[]) =>
  Object.fromEntries(properties.flatMap((key) => (record[key] === undefined ? [] : [[key, record[key]]])));

const previewIdentityProperties = [
  "success",
  "previewSession",
  "sessionId",
  "revision",
  "sessionRevision",
  "definitionId",
  "targetDefinitionId",
  "persistenceTool",
  "evidenceReset",
  "evidenceComplete",
  "recommendedNextTool",
  "unchanged",
  "preservesPreviewEvidence",
] as const;

const getIncompletePreviewHandoff = (output: Record<string, unknown>, originalCharacters: number) => ({
  ...pickOutputProperties(
    output,
    previewIdentityProperties.filter((key) => key !== "evidenceComplete" && key !== "recommendedNextTool"),
  ),
  truncated: true,
  originalCharacters,
  handoffComplete: false,
  persistenceBlocked: true,
  evidenceComplete: false,
  omittedFields: ["queries", "actions", "sourceConfigurations", "removedFromSaved"],
  recovery: {
    recoverable: true,
    kind: "incomplete-preview-handoff",
    allowedNextTools: ["customWidget_previewReviseTemplate", "customWidget_previewCreate"],
  },
  nextStep:
    "Do not persist or guess missing request/removal keys. Restore the loaded original JSX with customWidget_previewReviseTemplate and make a narrower edit; use customWidget_previewCreate with the same definitionId if manifest repair is needed. For a new widget, simplify the definition and recreate its preview. Require a complete new handoff and fresh evidence before persistence.",
});

const compactPreviewChecklist = (value: unknown, properties: readonly string[]) => {
  if (!Array.isArray(value)) return value;
  return value.map((entry) => (isRecord(entry) ? pickOutputProperties(entry, properties) : entry));
};

const createBoundedPreviewHandoff = (
  output: Record<string, unknown>,
  originalCharacters: number,
  maxCharacters: number,
  toolName: string,
) => {
  const handoffComplete = hasCompleteCustomWidgetPreviewHandoff(output, toolName);
  const identity = pickOutputProperties(output, previewIdentityProperties);
  if (isRecord(identity.previewSession)) {
    identity.previewSession = pickOutputProperties(identity.previewSession, [
      "id",
      "revision",
      "expiresAt",
      "liveActions",
      "definitionId",
    ]);
  }
  const base = {
    ...identity,
    truncated: true,
    originalCharacters,
    handoffComplete: true,
    sourceConfigurations: compactPreviewChecklist(output.sourceConfigurations, ["sourceId"]),
    removedFromSaved: output.removedFromSaved,
    removalDetection: output.removalDetection,
    nextStep:
      "Configure every listed source, test every listed query and action for this revision, then use persistenceTool. Restore unintended removedFromSaved keys; acknowledge only user-authorized removals. Revise the preview for any remaining requirement; a genuine revision resets evidence.",
  };
  const withParameters = {
    ...base,
    ...pickOutputProperties(output, ["previewPath", "previewUrl"]),
    queries: compactPreviewChecklist(output.queries, ["requestId", "trigger", "parameterNames"]),
    actions: compactPreviewChecklist(output.actions, ["requestId", "method", "parameterNames"]),
    parameterDetailsOmitted: false,
    omittedDetails: ["per-request guidance", "confirmation", "permissions", "invalidation", "bulk bodies"],
  };
  if (handoffComplete && JSON.stringify(withParameters).length <= maxCharacters) return withParameters;
  const minimal = {
    ...base,
    queries: compactPreviewChecklist(output.queries, ["requestId"]),
    actions: compactPreviewChecklist(output.actions, ["requestId"]),
    parameterDetailsOmitted: true,
    nextStep: `${base.nextStep} Parameter details were omitted: use the submitted definition's exact $param references; never infer that omitted parameters mean none are required.`,
  };
  if (handoffComplete && JSON.stringify(minimal).length <= maxCharacters) return minimal;
  const incomplete = getIncompletePreviewHandoff(identity, originalCharacters);
  if (JSON.stringify(incomplete).length <= maxCharacters) return incomplete;
  return {
    truncated: true,
    handoffComplete: false,
    persistenceBlocked: true,
    identityOmitted: true,
    recovery: { recoverable: true, allowedNextTools: ["customWidget_previewCreate"] },
    nextStep:
      "Preview identity exceeds the output budget. Do not persist. Restore the loaded original definition, make a narrower change, and call customWidget_previewCreate with its original definitionId; for creation simplify the new definition. Require a complete new preview handoff.",
  };
};

const evidenceMetadataProperties = [
  "sessionId",
  "previewSessionId",
  "requestId",
  "sourceId",
  "revision",
  "sessionRevision",
  "definitionId",
  "persistenceTool",
  "ok",
  "status",
  "statusText",
  "error",
  "simulated",
  "evidenceComplete",
  "evidenceReset",
  "recommendedNextTool",
  "requiredNextTool",
  "recovery",
  "nextStep",
  "handoffComplete",
] as const;

const createBoundedPreviewJournal = (entries: unknown[], originalCharacters: number, maxCharacters: number) => {
  const compactEntries = compactArrayItems(entries, [
    "id",
    "sessionId",
    "requestId",
    "sourceId",
    "kind",
    "method",
    "status",
    "simulated",
    "sessionRevision",
    "timestamp",
  ]);
  const compact = {
    truncated: true,
    originalCharacters,
    journalComplete: true,
    entries: compactEntries,
    omittedFields: ["path", "durationMs"],
  };
  if (JSON.stringify(compact).length <= maxCharacters) return compact;
  return {
    truncated: true,
    originalCharacters,
    journalComplete: false,
    handoffComplete: false,
    totalEntries: entries.length,
    nextStep:
      "The complete journal metadata exceeds the budget. Do not infer missing evidence; rerun the current preview's query/action checklist or create a narrower preview.",
  };
};

const compactArrayItems = (items: unknown[], itemProperties: readonly string[]) =>
  items.map((item) => {
    if (!isRecord(item)) return item;
    return Object.fromEntries(
      itemProperties.flatMap((property) => (item[property] === undefined ? [] : [[property, item[property]]])),
    );
  });

const createBoundedArrayOutput = (
  items: unknown[],
  outputProperty: string,
  originalCharacters: number,
  maxCharacters: number,
) => {
  const createOutput = (itemCount: number) => ({
    truncated: true as const,
    originalCharacters,
    totalItems: items.length,
    [outputProperty]: items.slice(0, itemCount),
    note: "Only the entries required for the next assistant action are included.",
  });
  let lowerBound = 0;
  let upperBound = items.length;
  while (lowerBound < upperBound) {
    const candidate = Math.ceil((lowerBound + upperBound) / 2);
    if (JSON.stringify(createOutput(candidate)).length <= maxCharacters) lowerBound = candidate;
    else upperBound = candidate - 1;
  }
  return createOutput(lowerBound);
};

/**
 * AI SDK model messages only accept JSON-compatible tool results. Homarr's tRPC callers can
 * return richer values such as Date, bigint, Map, Set, NaN, and nested undefined values.
 * SuperJSON's transport representation normalizes those values without restoring their runtime
 * types, keeping subsequent agent steps valid while preserving the useful data.
 */
export const toAssistantToolOutput = (value: unknown, options: AssistantToolOutputOptions = {}) => {
  const output = serialize(value as Parameters<typeof serialize>[0]).json;
  if (options.maxCharacters === undefined) return output;

  const serialized = JSON.stringify(output);
  if (serialized === undefined || serialized.length <= options.maxCharacters) return output;

  const outputRecord = isRecord(output) ? output : undefined;
  if (
    outputRecord &&
    (isRecord(outputRecord.previewSession) ||
      ((options.toolName === "customWidget_previewCreate" ||
        options.toolName === "customWidget_previewReviseTemplate") &&
        outputRecord.success === true))
  ) {
    return createBoundedPreviewHandoff(
      outputRecord,
      serialized.length,
      options.maxCharacters,
      options.toolName ?? "customWidget_previewCreate",
    );
  }
  if (Array.isArray(output) && options.toolName === "customWidget_previewJournal") {
    return createBoundedPreviewJournal(output, serialized.length, options.maxCharacters);
  }

  if (Array.isArray(output) && options.compactArray) {
    const compactItems = compactArrayItems(output, options.compactArray.itemProperties);
    const compactSerialized = JSON.stringify(compactItems);
    if (compactSerialized.length <= options.maxCharacters) return compactItems;
    return createBoundedArrayOutput(
      compactItems,
      options.compactArray.outputProperty,
      serialized.length,
      options.maxCharacters,
    );
  }

  const metadata = outputRecord ? pickOutputProperties(outputRecord, evidenceMetadataProperties) : {};
  if (JSON.stringify(metadata).length + 400 > options.maxCharacters) {
    for (const key of ["nextStep", "statusText", "error", "recovery"]) {
      if (metadata[key] === undefined) continue;
      delete metadata[key];
      metadata.detailsOmitted = true;
    }
  }
  const createPreview = (previewCharacters: number) => ({
    ...metadata,
    truncated: true as const,
    originalCharacters: serialized.length,
    preview: serialized.slice(0, previewCharacters),
    note: "The tool result was truncated to protect the conversation context. Use a narrower search or more specific tool when more detail is needed.",
  });
  if (JSON.stringify(createPreview(0)).length > options.maxCharacters) {
    return getIncompletePreviewHandoff({}, serialized.length);
  }
  let lowerBound = 0;
  let upperBound = serialized.length;
  while (lowerBound < upperBound) {
    const candidate = Math.ceil((lowerBound + upperBound) / 2);
    if (JSON.stringify(createPreview(candidate)).length <= options.maxCharacters) lowerBound = candidate;
    else upperBound = candidate - 1;
  }
  return createPreview(lowerBound);
};
