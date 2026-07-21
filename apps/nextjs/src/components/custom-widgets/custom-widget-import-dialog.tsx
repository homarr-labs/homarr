"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { IconKey } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { getCustomWidgetSecretRequirements, getImportReview } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { ImportReviewDialog } from "@homarr/custom-widgets/workbench";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

interface CustomWidgetImportDialogProps {
  opened: boolean;
  widget: HomarrCustomWidgetV2 | null;
  onClose(): void;
  onImported?(result: { id: string }): void;
}

export function CustomWidgetImportDialog({ opened, widget, onClose, onImported }: CustomWidgetImportDialogProps) {
  const t = useScopedI18n("customWidget");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const [values, setValues] = useState<Record<string, string>>({});
  const review = useMemo(() => getImportReview(widget), [widget]);
  const requirements = useMemo(() => getCustomWidgetSecretRequirements(widget?.sources ?? {}), [widget]);
  const mutation = clientApi.customWidget.import.useMutation({
    onSuccess: (result) => {
      showSuccessNotification({ title: t("action.import"), message: t("notification.imported") });
      void utils.customWidget.list.invalidate();
      void revalidatePathActionAsync("/manage/custom-widgets").then(() => router.refresh());
      onImported?.(result);
      onClose();
    },
    onError: (error) => {
      showErrorNotification({ title: t("action.import"), message: error.message || t("notification.importError") });
    },
  });

  useEffect(() => {
    if (opened) setValues({});
  }, [opened, widget]);

  const setValue = (sourceId: string, kind: string, value: string) => {
    setValues((current) => ({ ...current, [`${sourceId}:${kind}`]: value }));
  };

  const importWidget = () => {
    if (!widget) return;
    const secrets = requirements.flatMap((requirement) => {
      const value = values[`${requirement.sourceId}:${requirement.kind}`] ?? "";
      return value.trim() ? [{ sourceId: requirement.sourceId, kind: requirement.kind, value }] : [];
    });
    mutation.mutate({ widget, secrets });
  };

  return (
    <ImportReviewDialog
      opened={opened}
      review={review}
      pending={mutation.isPending}
      onClose={onClose}
      onConfirm={importWidget}
      messages={{
        title: t("importReview.title"),
        description: t("importReview.description"),
        name: t("importReview.name"),
        origin: t("importReview.origin"),
        authentication: t("importReview.authentication"),
        networkScope: t("importReview.networkScope"),
        methods: t("importReview.methods"),
        permissions: t("importReview.permissions"),
        actionWarningTitle: t("importReview.actionWarning.title"),
        actionWarningDescription: t("importReview.actionWarning.description"),
        cancel: t("importReview.cancel"),
        confirm: t("importReview.confirm"),
        permission: (permission) => t(`preview.request.permission.${permission}` as never),
      }}
    >
      {requirements.length > 0 && (
        <Stack gap="sm">
          <Alert color="yellow" icon={<IconKey size={16} />}>
            <Text fw={600} size="sm">
              {t("importReview.credentials.title")}
            </Text>
            <Text size="sm">{t("importReview.credentials.description")}</Text>
          </Alert>
          {requirements.map((requirement) => {
            const key = `${requirement.sourceId}:${requirement.kind}`;
            const label = `${requirement.sourceName} · ${t(`importReview.credentials.field.${requirement.kind}`)}`;
            const description = requirement.destination
              ? t(
                  requirement.authType === "apiKeyHeader"
                    ? "importReview.credentials.header"
                    : "importReview.credentials.query",
                  { name: requirement.destination },
                )
              : undefined;
            const Input = requirement.kind === "username" ? TextInput : PasswordInput;
            return (
              <Input
                key={key}
                label={label}
                description={description}
                value={values[key] ?? ""}
                onChange={(event) => setValue(requirement.sourceId, requirement.kind, event.currentTarget.value)}
                autoComplete="off"
              />
            );
          })}
        </Stack>
      )}
    </ImportReviewDialog>
  );
}
