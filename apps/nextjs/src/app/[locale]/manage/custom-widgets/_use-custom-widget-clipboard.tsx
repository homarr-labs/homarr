"use client";

import { useCallback, useEffect } from "react";
import { Alert, Badge, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { buildDisplayFormValues, getImportReview, parseCustomWidgetClipboard } from "@homarr/custom-widgets/core";
import { CUSTOM_WIDGET_AUTH_SECRET_FIELDS } from "@homarr/custom-widgets/workbench";
import { useConfirmModal } from "@homarr/modals";
import { showSuccessNotification } from "@homarr/notifications";

import type { CustomWidgetFormInstance, CustomWidgetTranslator } from "./_display-field-types";

interface UseCustomWidgetClipboardOptions {
  enabled: boolean;
  form: CustomWidgetFormInstance;
  t: CustomWidgetTranslator;
  onReplace: () => void;
}

export function useCustomWidgetClipboard({ enabled, form, t, onReplace }: UseCustomWidgetClipboardOptions) {
  const { openConfirmModal } = useConfirmModal();
  const queueReplacement = useCallback(
    (widget: Record<string, unknown>) => {
      const review = getImportReview(widget);
      if (!review) return;
      openConfirmModal({
        title: t("importReview.replaceTitle"),
        children: (
          <Stack gap="sm">
            <Text size="sm">{t("importReview.replaceDescription", { name: review.name, origin: review.origin })}</Text>
            <Group gap={6}>
              {review.methods.map((method) => (
                <Badge key={method} color={{ DELETE: "red", GET: "blue" }[method] ?? "orange"}>
                  {method}
                </Badge>
              ))}
            </Group>
            {review.hasActions && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
                <Text size="sm">{t("importReview.actionWarning.description")}</Text>
              </Alert>
            )}
          </Stack>
        ),
        labels: { confirm: t("importReview.replaceConfirm"), cancel: t("importReview.cancel") },
        onConfirm: () => {
          const displayType = String(widget.displayType);
          const displayConfig = widget.displayConfig as Record<string, unknown>;
          const authType = typeof widget.authType === "string" ? widget.authType : "none";
          const secrets = (CUSTOM_WIDGET_AUTH_SECRET_FIELDS[authType] ?? []).map((field) => {
            const existing = form.values.secrets.find((secret) => secret.kind === field.kind);
            return { kind: field.kind, value: existing?.value ?? "", hasValue: existing?.hasValue ?? false };
          });
          form.setValues({
            ...form.values,
            name: String(widget.name),
            description: typeof widget.description === "string" ? widget.description : "",
            iconUrl: typeof widget.iconUrl === "string" ? widget.iconUrl : "",
            url: String(widget.url),
            authType,
            headerName: typeof widget.headerName === "string" ? widget.headerName : "",
            method: typeof widget.method === "string" ? widget.method : "GET",
            requestBody: typeof widget.requestBody === "string" ? widget.requestBody : "",
            ...buildDisplayFormValues(displayType, displayConfig),
            secrets,
          });
          onReplace();
          showSuccessNotification({ title: t("action.import"), message: t("notification.pastedForReplacement") });
        },
      });
    },
    [form, onReplace, openConfirmModal, t],
  );

  useEffect(() => {
    if (!enabled) return;
    const handlePaste = (event: ClipboardEvent) => {
      const widget = parseCustomWidgetClipboard(event.clipboardData?.getData("text/plain") ?? "");
      if (!widget) return;
      event.preventDefault();
      queueReplacement(widget);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [enabled, queueReplacement]);
}
