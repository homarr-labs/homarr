"use client";

import { Alert, Badge, Group, List, Stack, Text } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import type { ScopedTranslationFunction } from "@homarr/translation";

type ValidationResult = RouterOutputs["backup"]["validate"];

interface BackupValidationSummaryProps {
  validation: ValidationResult;
  tBackup: ScopedTranslationFunction<"backup">;
}

export const BackupValidationSummary = ({ validation, tBackup }: BackupValidationSummaryProps) => {
  return (
    <Stack>
      {validation.valid ? (
        <Alert color="green" icon={<IconCheck />}>
          {tBackup("action.restore.validation.valid")}
        </Alert>
      ) : (
        <Alert color="red" icon={<IconX />}>
          {tBackup("action.restore.validation.invalid")}
        </Alert>
      )}

      {validation.errors.length > 0 && (
        <Stack gap="xs">
          <Text fw={500} c="red">
            {tBackup("action.restore.validation.errors")}
          </Text>
          <List size="sm">
            {validation.errors.map((error) => (
              <List.Item key={error} c="red">
                {error}
              </List.Item>
            ))}
          </List>
        </Stack>
      )}

      {validation.warnings.length > 0 && (
        <Stack gap="xs">
          <Text fw={500} c="yellow">
            {tBackup("action.restore.validation.warnings")}
          </Text>
          <List size="sm">
            {validation.warnings.map((warning) => (
              <List.Item key={warning} c="yellow">
                {warning}
              </List.Item>
            ))}
          </List>
        </Stack>
      )}

      <Stack gap="xs">
        <Text fw={500}>{tBackup("action.restore.validation.summary")}</Text>
        <Group gap="xs">
          <Badge>
            {validation.summary.boards} {tBackup("action.restore.validation.entities.boards")}
          </Badge>
          <Badge>
            {validation.summary.integrations} {tBackup("action.restore.validation.entities.integrations")}
          </Badge>
          <Badge>
            {validation.summary.users} {tBackup("action.restore.validation.entities.users")}
          </Badge>
          <Badge>
            {validation.summary.groups} {tBackup("action.restore.validation.entities.groups")}
          </Badge>
          <Badge>
            {validation.summary.apps} {tBackup("action.restore.validation.entities.apps")}
          </Badge>
          <Badge>
            {validation.summary.searchEngines} {tBackup("action.restore.validation.entities.searchEngines")}
          </Badge>
          <Badge>
            {validation.summary.mediaFiles} {tBackup("action.restore.validation.entities.mediaFiles")}
          </Badge>
        </Group>
      </Stack>
    </Stack>
  );
};
