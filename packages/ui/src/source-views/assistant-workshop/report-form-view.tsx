"use client";

import { Alert, Box, Button, CloseButton, Collapse, Group, Paper, Select, Stack, Text, Textarea } from "@mantine/core";

import type { WorkshopReportCategory, WorkshopReportFormViewProps } from "./contracts";

const categories: readonly WorkshopReportCategory[] = [
  "outdated",
  "malicious",
  "spam",
  "copyright",
  "inappropriate",
  "other",
];

export function WorkshopReportFormView({
  opened,
  category,
  explanation,
  error,
  pending,
  title,
  explanationLabel,
  reasonLabel,
  categoryLabels,
  closeLabel,
  cancelLabel,
  sendLabel,
  onCategoryChange,
  onExplanationChange,
  onClose,
  onSubmit,
}: WorkshopReportFormViewProps) {
  return (
    <Collapse id="workshop-report-form" expanded={opened}>
      <Paper p="md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (pending || explanation.trim().length < 3) return;
            onSubmit();
          }}
        >
          <Stack>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Box>
                <Text fw={600}>{title}</Text>
                <Text size="sm" c="dimmed">
                  {explanationLabel}
                </Text>
              </Box>
              <CloseButton aria-label={closeLabel} onClick={onClose} />
            </Group>
            <Select<WorkshopReportCategory>
              label={reasonLabel}
              value={category}
              onChange={(value) => onCategoryChange(value ?? "other")}
              data={categories.map((value) => ({ value, label: categoryLabels[value] }))}
              allowDeselect={false}
            />
            <Textarea
              label={explanationLabel}
              minRows={4}
              autosize
              value={explanation}
              onChange={(event) => onExplanationChange(event.currentTarget.value)}
            />
            {error !== null && <Alert color="red">{error}</Alert>}
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={onClose}>
                {cancelLabel}
              </Button>
              <Button type="submit" color="red" loading={pending} disabled={explanation.trim().length < 3}>
                {sendLabel}
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Collapse>
  );
}
