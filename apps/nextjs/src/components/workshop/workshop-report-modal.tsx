"use client";

import { useState } from "react";
import { Alert, Button, Group, Modal, Select, Stack, Textarea } from "@mantine/core";

import { showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type { WorkshopBackend } from "@homarr/workshop/backend";
import { useWorkshopReportMutation } from "@homarr/workshop/backend";
import type { WorkshopReport } from "@homarr/workshop/schema";

const categories = ["outdated", "malicious", "spam", "copyright", "inappropriate", "other"] as const;

interface WorkshopReportModalProps {
  client: WorkshopBackend;
  submissionId: string;
  opened: boolean;
  onClose(): void;
}

export function WorkshopReportModal({ client, submissionId, opened, onClose }: WorkshopReportModalProps) {
  const t = useScopedI18n("workshop");
  const [category, setCategory] = useState<WorkshopReport["category"]>("other");
  const [explanation, setExplanation] = useState("");
  const report = useWorkshopReportMutation(client);

  const close = () => {
    setExplanation("");
    report.reset();
    onClose();
  };

  const submit = () =>
    report.mutate(
      { submission: submissionId, category, explanation },
      {
        onSuccess: () => {
          showSuccessNotification({
            title: t("reportSent"),
            message: t("reportSentDescription"),
          });
          close();
        },
      },
    );

  return (
    <Modal opened={opened} onClose={close} title={t("reportTitle")} centered radius="md">
      <Stack>
        <Select
          label={t("reportReason")}
          value={category}
          onChange={(value) => setCategory((value as WorkshopReport["category"] | null) ?? "other")}
          data={categories.map((value) => ({
            value,
            label: t(`reportCategory.${value}`),
          }))}
          allowDeselect={false}
        />
        <Textarea
          label={t("reportExplanation")}
          minRows={4}
          autosize
          value={explanation}
          onChange={(event) => setExplanation(event.currentTarget.value)}
        />
        {report.error && <Alert color="red">{report.error.message}</Alert>}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={close}>
            {t("cancel")}
          </Button>
          <Button color="red" loading={report.isPending} disabled={explanation.trim().length < 3} onClick={submit}>
            {t("reportSend")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
