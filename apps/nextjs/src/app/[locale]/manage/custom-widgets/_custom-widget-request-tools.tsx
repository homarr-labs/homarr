"use client";

import { useEffect, useState } from "react";
import { Button, Group, Select, TextInput } from "@mantine/core";
import { IconEdit, IconTargetArrow } from "@tabler/icons-react";

import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

export function CustomWidgetRequestTools({
  requestIds,
  onGoTo,
  onRename,
}: {
  requestIds: string[];
  onGoTo(requestId: string): void;
  onRename(currentId: string, nextId: string): void;
}) {
  const t = useScopedI18n("customWidget.workbench.requests");
  const [selected, setSelected] = useState(requestIds[0] ?? "");
  const [nextId, setNextId] = useState(requestIds[0] ?? "");

  useEffect(() => {
    if (!requestIds.includes(selected)) {
      setSelected(requestIds[0] ?? "");
      setNextId(requestIds[0] ?? "");
    }
  }, [requestIds, selected]);

  if (requestIds.length === 0) return null;
  const rename = () => {
    try {
      onRename(selected, nextId);
      setSelected(nextId);
    } catch (error) {
      showErrorNotification({
        title: t("rename"),
        message: error instanceof Error ? error.message : t("renameFailed"),
      });
    }
  };

  return (
    <Group align="end" grow wrap="wrap">
      <Select
        label={t("selected")}
        data={requestIds}
        value={selected}
        onChange={(value) => {
          setSelected(value ?? "");
          setNextId(value ?? "");
        }}
        searchable
      />
      <Button
        type="button"
        variant="light"
        leftSection={<IconTargetArrow size={16} />}
        onClick={() => onGoTo(selected)}
      >
        {t("goTo")}
      </Button>
      <TextInput label={t("newId")} value={nextId} onChange={(event) => setNextId(event.currentTarget.value)} />
      <Button
        type="button"
        variant="light"
        leftSection={<IconEdit size={16} />}
        disabled={!nextId || nextId === selected}
        onClick={rename}
      >
        {t("rename")}
      </Button>
    </Group>
  );
}
