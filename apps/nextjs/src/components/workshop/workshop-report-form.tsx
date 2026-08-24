"use client";

import { useState } from "react";
import { Alert, Box, Button, CloseButton, Collapse, Group, Paper, Select, Stack, Text, Textarea } from "@mantine/core";

import { showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { WorkshopBackend } from "@homarr/workshop/backend";
import { useWorkshopReportMutation } from "@homarr/workshop/backend";
import type { WorkshopReport } from "@homarr/workshop/schema";

const categories = ["outdated", "malicious", "spam", "copyright", "inappropriate", "other"] as const;

interface WorkshopReportFormProps {
  client: WorkshopBackend;
  submissionId: string;
  opened: boolean;
  onClose(): void;
}

export function WorkshopReportForm({ client, submissionId, opened, onClose }: WorkshopReportFormProps) {
  const t = useI18n("workshop");
  const tCommon = useI18n("common");
  const [category, setCategory] = useState<WorkshopReport["category"]>("other");
  const [explanation, setExplanation] = useState("");
  const report = useWorkshopReportMutation(client);

  const close = () => {
    setCategory("other");
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
    <Collapse id="workshop-report-form" expanded={opened}>
      <Paper p="md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Stack>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Box>
                <Text fw={600}>{t("reportTitle")}</Text>
                <Text size="sm" c="dimmed">
                  {t("reportExplanation")}
                </Text>
              </Box>
              <CloseButton aria-label={tCommon("action.close")} onClick={close} />
            </Group>
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
                {tCommon("action.cancel")}
              </Button>
              <Button type="submit" color="red" loading={report.isPending} disabled={explanation.trim().length < 3}>
                {t("reportSend")}
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Collapse>
  );
}
