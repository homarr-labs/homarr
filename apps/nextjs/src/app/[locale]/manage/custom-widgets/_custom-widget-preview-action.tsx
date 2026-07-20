"use client";

import { useState } from "react";
import { Button, Fieldset, Stack, Textarea } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { isRuntimeParams, parseJson } from "./_custom-widget-form-utils";

export function PreviewActionControl({
  request,
  sessionId,
}: {
  request: HomarrCustomWidgetV2["requests"][number];
  sessionId?: string;
}) {
  const t = useScopedI18n("customWidget.workbench.preview");
  const { openConfirmModal } = useConfirmModal();
  const actionMutation = clientApi.customWidget.previewAction.useMutation();
  const initialParams = Object.fromEntries(
    Object.entries(request.parameters).map(([name, type]) => [
      name,
      type === "number" ? 0 : type === "boolean" ? false : "",
    ]),
  );
  const [params, setParams] = useState(JSON.stringify(initialParams, null, 2));
  const parsed = parseJson(params);
  const validParams = isRuntimeParams(parsed, request.parameters) ? parsed : null;
  const run = async () => {
    if (!sessionId || !validParams) return;
    const needsConfirmation = request.confirmation !== undefined || request.method === "DELETE";
    if (needsConfirmation) {
      const confirmed = await new Promise<boolean>((resolve) => {
        openConfirmModal({
          title: request.confirmation?.title ?? request.id,
          children: request.confirmation?.message ?? t("deleteConfirmation"),
          labels: { confirm: request.confirmation?.confirmLabel },
          confirmProps: { color: request.confirmation?.destructive || request.method === "DELETE" ? "red.9" : "blue" },
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return;
    }
    actionMutation.mutate(
      { sessionId, requestId: request.id, params: validParams, confirmed: needsConfirmation },
      {
        onSuccess: (result) =>
          showSuccessNotification({
            title: request.id,
            message: result.simulated ? t("simulated") : t("httpStatus", { status: result.status }),
          }),
        onError: (error) => showErrorNotification({ title: request.id, message: error.message }),
      },
    );
  };
  return (
    <Fieldset legend={`${request.id} · ${request.method}`}>
      <Stack gap="xs">
        {Object.keys(request.parameters).length > 0 && (
          <Textarea
            label={t("actionParameters")}
            autosize
            minRows={2}
            value={params}
            error={validParams ? undefined : t("invalidParameters")}
            onChange={(event) => setParams(event.currentTarget.value)}
          />
        )}
        <Button
          type="button"
          variant="light"
          color={request.confirmation?.destructive || request.method === "DELETE" ? "red" : undefined}
          disabled={!sessionId || !validParams}
          loading={actionMutation.isPending}
          onClick={() => void run()}
        >
          {request.confirmation?.confirmLabel ??
            (request.confirmation?.destructive || request.method === "DELETE" ? t("runDestructive") : t("runAction"))}
        </Button>
      </Stack>
    </Fieldset>
  );
}
