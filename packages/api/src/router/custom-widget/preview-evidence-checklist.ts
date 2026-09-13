import { collectCustomWidgetRequestReferences, getCustomWidgetConfirmation } from "@homarr/custom-widgets/core";
import type { CustomJsxRequest, CustomWidgetNativeCapability } from "@homarr/custom-widgets/core";

export const getPreviewEvidenceChecklist = (
  requests: Record<string, CustomJsxRequest>,
  sessionId: string,
  native: Record<string, CustomWidgetNativeCapability> = {},
) => ({
  queries: Object.entries(requests).flatMap(([requestId, request]) => {
    if (request.kind !== "query") return [];
    return [
      {
        requestId,
        trigger: request.trigger,
        parameterNames: [...collectCustomWidgetRequestReferences(request).params],
        nextStep: `Call customWidget_previewQuery with sessionId '${sessionId}' and requestId '${requestId}'.`,
      },
    ];
  }),
  actions: Object.entries(requests).flatMap(([requestId, request]) => {
    if (request.kind !== "action") return [];
    return [
      {
        requestId,
        method: request.method,
        parameterNames: [...collectCustomWidgetRequestReferences(request).params],
        minimumBoardPermission: request.permission,
        confirmation: getCustomWidgetConfirmation(request),
        invalidates: request.invalidates ?? [],
        nextStep: `Call customWidget_previewAction with sessionId '${sessionId}' and requestId '${requestId}'. Actions are simulated unless live preview actions were explicitly enabled.`,
      },
    ];
  }),
  nativeQueries: Object.entries(native).flatMap(([nativeId, capability]) => {
    if (capability.kind !== "query") return [];
    return [
      {
        nativeId,
        capability: capability.capability,
        trigger: capability.trigger,
        parameterNames: [...collectCustomWidgetRequestReferences({ path: "", body: capability.input }).params],
        nextStep: `Call customWidget_nativeQuery with previewSessionId '${sessionId}' and nativeId '${nativeId}'.`,
      },
    ];
  }),
  nativeActions: Object.entries(native).flatMap(([nativeId, capability]) => {
    if (capability.kind !== "action") return [];
    return [
      {
        nativeId,
        capability: capability.capability,
        parameterNames: [...collectCustomWidgetRequestReferences({ path: "", body: capability.input }).params],
        minimumBoardPermission: capability.permission,
        confirmation: capability.confirmation,
        nextStep: `Call customWidget_nativeAction with previewSessionId '${sessionId}' and nativeId '${nativeId}'. Actions simulate unless live preview actions were explicitly enabled. Live execution requires confirmed=true.`,
      },
    ];
  }),
});
