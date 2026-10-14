"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Combobox,
  Group,
  Loader,
  PillsInput,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  useCombobox,
} from "@mantine/core";
import { IconCheck, IconLink, IconPlus } from "@tabler/icons-react";

import type { SortableItemListInput } from "../options";
import { createDirectBookmark, getBookmarkFaviconUrl, splitBookmarkUrls } from "./bookmark-item";
import type { BookmarkSelectableAppsObservation, BookmarkSelectionItem } from "./selection-type";

export type BookmarkAddButtonViewProps = Parameters<
  SortableItemListInput<BookmarkSelectionItem, string>["AddButton"]
>[0] & {
  selectableApps: BookmarkSelectableAppsObservation;
  labels: {
    label: string;
    description: string;
    placeholder: string;
    addUrl: string;
    hint: string;
    error: string;
    notFound: string;
  };
  groupsEditor: ReactElement;
};

const createOptionValue = "$create-url";

export const BookmarkAddButtonView = ({
  addItem,
  migrateItems,
  values,
  initialOptions,
  selectableApps,
  labels,
  groupsEditor,
}: BookmarkAddButtonViewProps) => {
  const { data: apps = [], isPending, error } = selectableApps;
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });
  const selectedValues = useMemo(() => new Set(values), [values]);
  const migrationStartedRef = useRef(false);
  const legacyUrls = useMemo(() => {
    if (!Array.isArray(initialOptions.customUrls)) return [];
    return initialOptions.customUrls.filter((value): value is string => typeof value === "string");
  }, [initialOptions.customUrls]);

  useEffect(() => {
    if (migrationStartedRef.current || legacyUrls.length === 0) return;

    migrationStartedRef.current = true;
    const legacyItems = legacyUrls.flatMap((url) => createDirectBookmark(url) ?? []);
    migrateItems(legacyItems, { customUrls: [] });
  }, [legacyUrls, migrateItems]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredApps = apps.filter((app) => {
    if (selectedValues.has(app.id)) return false;
    if (normalizedSearch.length === 0) return true;

    return app.name.toLowerCase().includes(normalizedSearch) || app.href?.toLowerCase().includes(normalizedSearch);
  });
  const pendingUrl = createDirectBookmark(search);

  const addUrls = (input: string) => {
    const nextValues = new Set(values);
    for (const value of splitBookmarkUrls(input)) {
      const item = createDirectBookmark(value);
      if (!item || nextValues.has(item.id)) continue;
      addItem(item);
      nextValues.add(item.id);
    }
    setSearch("");
    combobox.closeDropdown();
  };

  const handleOptionSubmit = (value: string) => {
    if (value === createOptionValue) {
      addUrls(search);
      return;
    }

    const app = apps.find((candidate) => candidate.id === value);
    if (app) addItem(app);
    setSearch("");
  };

  const options = filteredApps.map((app) => (
    <Combobox.Option value={app.id} key={app.id}>
      <Group gap="sm" wrap="nowrap">
        <Avatar src={app.iconUrl} name={app.name} color="gray" size={28} radius="sm">
          <IconLink size={16} />
        </Avatar>
        <Stack gap={0} miw={0} flex={1}>
          <Text size="sm" fw={600} truncate>
            {app.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {app.href}
          </Text>
        </Stack>
        <IconPlus size={16} aria-hidden />
      </Group>
    </Combobox.Option>
  ));

  return (
    <Stack gap="sm">
      <Combobox
        store={combobox}
        onOptionSubmit={handleOptionSubmit}
        position="bottom-start"
        middlewares={{ flip: true, shift: true }}
        styles={{
          dropdown: { overflow: "hidden" },
          option: { borderRadius: "var(--mantine-radius-sm)" },
        }}
      >
        <Combobox.DropdownTarget>
          <PillsInput
            label={labels.label}
            description={labels.description}
            error={error ? labels.error : undefined}
            onClick={() => combobox.openDropdown()}
            leftSection={
              <ThemeIcon variant="light" size="sm" radius="xl">
                <IconLink size={14} />
              </ThemeIcon>
            }
            rightSection={isPending ? <Loader size="xs" /> : undefined}
            styles={{ input: { minHeight: 44 } }}
          >
            <Combobox.EventsTarget>
              <PillsInput.Field
                value={search}
                placeholder={labels.placeholder}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  combobox.openDropdown();
                  combobox.updateSelectedOptionIndex();
                }}
                onPaste={(event) => {
                  const pastedValue = event.clipboardData.getData("text");
                  if (splitBookmarkUrls(pastedValue).length < 2) return;
                  event.preventDefault();
                  addUrls(pastedValue);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  if (!pendingUrl) return;
                  event.preventDefault();
                  addUrls(search);
                }}
              />
            </Combobox.EventsTarget>
          </PillsInput>
        </Combobox.DropdownTarget>

        <Combobox.Dropdown>
          <ScrollArea.Autosize mah={280}>
            <Combobox.Options>
              {pendingUrl && !selectedValues.has(pendingUrl.id) ? (
                <Combobox.Option value={createOptionValue}>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar src={getBookmarkFaviconUrl(pendingUrl.href)} size={28} radius="sm" color="gray">
                      <IconLink size={16} />
                    </Avatar>
                    <Stack gap={0} miw={0} flex={1}>
                      <Text size="sm" fw={600} truncate>
                        {labels.addUrl}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {pendingUrl.href}
                      </Text>
                    </Stack>
                    <IconCheck size={16} aria-hidden />
                  </Group>
                </Combobox.Option>
              ) : null}
              {options}
              {!pendingUrl && options.length === 0 ? <Combobox.Empty>{labels.notFound}</Combobox.Empty> : null}
            </Combobox.Options>
          </ScrollArea.Autosize>
          <Combobox.Footer>
            <Text size="xs" c="dimmed">
              {labels.hint}
            </Text>
          </Combobox.Footer>
        </Combobox.Dropdown>
      </Combobox>
      {groupsEditor}
    </Stack>
  );
};
