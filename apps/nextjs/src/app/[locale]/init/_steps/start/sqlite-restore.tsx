"use client";

import { useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { IconDatabaseImport } from "@tabler/icons-react";

import { getMantineColor } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import { DatabaseRestoreFlow } from "~/components/backup";

export const InitSqliteRestore = () => {
  const t = useScopedI18n("init.step.start.action");
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <Stack gap="sm">
        <Button variant="subtle" size="xs" onClick={() => setExpanded(false)}>
          {t("backToOptions")}
        </Button>
        <Text size="sm" c="dimmed">
          {t("restoreSqliteDescription")}
        </Text>
        <DatabaseRestoreFlow variant="standalone" />
      </Stack>
    );
  }

  return (
    <Button
      onClick={() => setExpanded(true)}
      variant="default"
      leftSection={<IconDatabaseImport color={getMantineColor("orange", 6)} size={16} stroke={1.5} />}
    >
      {t("restoreSqlite")}
    </Button>
  );
};
