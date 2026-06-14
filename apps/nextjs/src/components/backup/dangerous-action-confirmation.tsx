"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Alert, Box, Button, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertTriangle, IconShieldExclamation } from "@tabler/icons-react";

const CONFIRMATION_PHRASE = "I understand";

interface DangerousActionConfirmationProps {
  title: string;
  warningTitle: string;
  warningBody: string;
  typePrompt: string;
  submitLabel: string;
  submitIcon: ReactNode;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
  color?: string;
}

export const DangerousActionConfirmation = ({
  title,
  warningTitle,
  warningBody,
  typePrompt,
  submitLabel,
  submitIcon,
  cancelLabel,
  onConfirm,
  onCancel,
  disabled,
  color = "red",
}: DangerousActionConfirmationProps) => {
  const [value, setValue] = useState("");
  const isMatch = value.trim().toLowerCase() === CONFIRMATION_PHRASE.toLowerCase();

  return (
    <Paper p="lg" radius="md" withBorder bd={`1px solid var(--mantine-color-${color}-9)`}>
      <Stack gap="md">
        <Group gap="sm">
          <IconShieldExclamation size={24} color={`var(--mantine-color-${color}-6)`} />
          <Text size="lg" fw={700} c={color}>
            {title}
          </Text>
        </Group>

        <Alert color={color} variant="light" icon={<IconAlertTriangle size={20} />}>
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              {warningTitle}
            </Text>
            <Text size="sm">{warningBody}</Text>
          </Stack>
        </Alert>

        <Box>
          <Text size="sm" fw={500} mb={4}>
            {typePrompt}
          </Text>
          <TextInput
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            placeholder={CONFIRMATION_PHRASE}
            disabled={disabled}
            styles={{
              input: {
                fontFamily: "var(--mantine-font-family-monospace)",
                borderColor: isMatch ? "var(--mantine-color-green-6)" : undefined,
              },
            }}
          />
        </Box>

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onCancel} disabled={disabled}>
            {cancelLabel}
          </Button>
          <Button color={color} leftSection={submitIcon} onClick={onConfirm} disabled={!isMatch || disabled}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};
