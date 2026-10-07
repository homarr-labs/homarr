"use client";

import { useState } from "react";
import { ActionIcon, Button, Group, Select, Stack, TextInput } from "@mantine/core";
import { IconPlus, IconX } from "@tabler/icons-react";

import { createId } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { useFormContext } from "../_inputs/form";

import { getBookmarkGroups } from "./groups-data";

export const BookmarkGroupsEditor = () => {
  const form = useFormContext();
  const t = useI18n("widget.bookmarks.groups");
  const [name, setName] = useState("");
  const groups = getBookmarkGroups(form.values.options.groups);
  const trimmedName = name.trim();
  const duplicateName = groups.some((group) => group.name.toLowerCase() === trimmedName.toLowerCase());
  const addGroup = () => {
    if (!trimmedName || duplicateName) return;
    form.setFieldValue("options.groups", [...groups, { id: createId(), name: trimmedName, itemIds: [] }]);
    setName("");
  };
  return (
    <Stack gap="xs">
      <Group align="end" wrap="nowrap">
        <TextInput
          label={t("label")}
          placeholder={t("placeholder")}
          value={name}
          maxLength={64}
          onChange={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addGroup();
          }}
          style={{ flex: 1 }}
        />
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          disabled={!trimmedName || duplicateName}
          onClick={addGroup}
        >
          {t("add")}
        </Button>
      </Group>
      {groups.map((group) => (
        <Group key={group.id} justify="space-between" wrap="nowrap">
          <TextInput
            size="xs"
            aria-label={t("rename", { name: group.name })}
            defaultValue={group.name}
            maxLength={64}
            style={{ flex: 1 }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.currentTarget.blur();
            }}
            onBlur={(event) => {
              const nextName = event.currentTarget.value.trim();
              if (
                !nextName ||
                groups.some(
                  (candidate) => candidate.id !== group.id && candidate.name.toLowerCase() === nextName.toLowerCase(),
                )
              ) {
                event.currentTarget.value = group.name;
                return;
              }
              form.setFieldValue(
                "options.groups",
                groups.map((candidate) => {
                  if (candidate.id !== group.id) return candidate;
                  return { ...candidate, name: nextName };
                }),
              );
            }}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={t("remove", { name: group.name })}
            onClick={() =>
              form.setFieldValue(
                "options.groups",
                groups.filter((candidate) => candidate.id !== group.id),
              )
            }
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      ))}
    </Stack>
  );
};

export const BookmarkGroupSelect = ({ itemId, name }: { itemId: string; name: string }) => {
  const form = useFormContext();
  const t = useI18n("widget.bookmarks.groups");
  const groups = getBookmarkGroups(form.values.options.groups);
  if (groups.length === 0) return null;
  const selectedGroup = groups.find((group) => group.itemIds.includes(itemId));
  return (
    <Select
      size="xs"
      aria-label={t("assign", { name })}
      placeholder={t("ungrouped")}
      clearable
      value={selectedGroup?.id ?? null}
      data={groups.map((group) => ({ value: group.id, label: group.name }))}
      onChange={(groupId) => {
        form.setFieldValue(
          "options.groups",
          groups.map((group) => {
            const itemIds = group.itemIds.filter((id) => id !== itemId);
            if (group.id === groupId) itemIds.push(itemId);
            return { ...group, itemIds };
          }),
        );
      }}
    />
  );
};
