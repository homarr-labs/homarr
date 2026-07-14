"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";
import type {
  CustomWidgetAuthType,
  CustomWidgetDisplayType,
  CustomWidgetMethod,
  CustomWidgetSecretKind,
  DisplayConfig,
} from "@homarr/custom-widgets/core";
import { buildDisplayConfigFromFormValues } from "@homarr/custom-widgets/core";
import { showErrorNotification } from "@homarr/notifications";

import type { CustomWidgetFormInstance, CustomWidgetTranslator } from "./_display-field-types";
import type { PreviewFetchResult, PreviewInput } from "./_custom-widget-preview";

interface UseCustomWidgetPreviewOptions {
  form: CustomWidgetFormInstance;
  definitionId?: string;
  refreshSignal: number;
  onOpenPreview: () => void;
  t: CustomWidgetTranslator;
}

export function useCustomWidgetPreview({
  form,
  definitionId,
  refreshSignal,
  onOpenPreview,
  t,
}: UseCustomWidgetPreviewOptions) {
  const previewMutation = clientApi.customWidget.preview.useMutation();
  const liveActionsMutation = clientApi.customWidget.setPreviewLiveActions.useMutation();
  const [json, setJson] = useState<unknown>(null);
  const [fetchResult, setFetchResult] = useState<PreviewFetchResult | null>(null);
  const [lastFingerprint, setLastFingerprint] = useState<string | null>(null);
  const hasTestedRef = useRef(false);

  const getInput = useCallback((): PreviewInput => {
    const values = form.values;
    return {
      url: values.url,
      method: values.method as CustomWidgetMethod,
      authType: values.authType as CustomWidgetAuthType,
      headerName: values.headerName || undefined,
      requestBody: values.requestBody || undefined,
      displayType: values.displayType as CustomWidgetDisplayType,
      displayConfig: buildDisplayConfigFromFormValues(values) as DisplayConfig,
      secrets: values.secrets
        .filter((secret) => secret.value)
        .map((secret) => ({ kind: secret.kind as CustomWidgetSecretKind, value: secret.value })),
      definitionId,
    };
  }, [definitionId, form.values]);

  const test = useCallback(async () => {
    const input = getInput();
    if (!input.url || input.method !== "GET") return;
    onOpenPreview();
    setLastFingerprint(JSON.stringify(input));
    try {
      const result = await previewMutation.mutateAsync(input);
      hasTestedRef.current = true;
      setFetchResult({
        success: result.success,
        error: result.success ? undefined : result.error,
        responseInfo: result.responseInfo,
        rawResponse: result.rawResponse,
        previewSession: result.previewSession,
      });
      if (!result.success || !result.rawResponse) return setJson(null);
      try {
        setJson(JSON.parse(result.rawResponse));
      } catch {
        setJson(null);
      }
    } catch {
      setFetchResult({ success: false, error: t("notification.previewError"), responseInfo: null, rawResponse: null });
      setJson(null);
    }
  }, [getInput, onOpenPreview, previewMutation, t]);

  const setLiveActions = useCallback(
    async (enabled: boolean) => {
      const sessionId = fetchResult?.previewSession?.id;
      if (!sessionId) return;
      try {
        const previewSession = await liveActionsMutation.mutateAsync({ sessionId, enabled });
        setFetchResult((current) => (current ? { ...current, previewSession } : current));
      } catch {
        showErrorNotification({
          title: t("preview.capabilities.liveActions"),
          message: t("notification.previewActionsError"),
        });
      }
    },
    [fetchResult?.previewSession?.id, liveActionsMutation, t],
  );

  const testRef = useRef(test);
  testRef.current = test;
  const getInputRef = useRef(getInput);
  getInputRef.current = getInput;
  const pendingRefreshRef = useRef(false);
  useEffect(() => {
    if (refreshSignal <= 0 || !hasTestedRef.current) return;
    if (previewMutation.isPending) return void (pendingRefreshRef.current = true);
    if (getInputRef.current().method === "GET") void testRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshSignal is the explicit event source
  }, [refreshSignal]);
  useEffect(() => {
    if (previewMutation.isPending || !pendingRefreshRef.current) return;
    pendingRefreshRef.current = false;
    if (getInputRef.current().method === "GET" && hasTestedRef.current) void testRef.current();
  }, [previewMutation.isPending]);

  const input = getInput();
  const isStale = lastFingerprint !== null && lastFingerprint !== JSON.stringify(input);
  const insertDataPath = useCallback(
    (path: string) => {
      if (form.values.displayType !== "customJsx") return;
      const template = form.values.template.trimEnd();
      const snippet = `<Text>{${path}}</Text>`;
      form.setFieldValue("template", template ? `${template}\n${snippet}` : snippet);
    },
    [form],
  );
  const setSampleData = useCallback((value: unknown) => {
    setJson(value);
    setFetchResult({ success: true, responseInfo: null, rawResponse: JSON.stringify(value, null, 2) });
    setLastFingerprint(null);
  }, []);
  const reset = useCallback(() => {
    setJson(null);
    setFetchResult(null);
    setLastFingerprint(null);
  }, []);

  return {
    input,
    getInput,
    json,
    fetchResult,
    isStale,
    test,
    setLiveActions,
    insertDataPath,
    setSampleData,
    reset,
    isTesting: previewMutation.isPending,
    testError: previewMutation.error,
    isUpdatingLiveActions: liveActionsMutation.isPending,
  };
}
