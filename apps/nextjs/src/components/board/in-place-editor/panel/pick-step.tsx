"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Box, Combobox, Group, Loader, Text, TextInput, useCombobox } from "@mantine/core";
import { IconPlus, IconSearch } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { CatalogEntry } from "../catalog";
import { CatalogOption } from "./catalog-option";
import type { InPlaceEditorPanelProps } from "./types";
import classes from "./panel.module.css";
import { KeyboardHints } from "./keyboard-hints";

type PickStepProps = Pick<
  InPlaceEditorPanelProps,
  "useCatalog" | "actions" | "AreaSizeInputs" | "onKeyDown" | "canCreateApp"
> & {
  flipped: boolean;
};

interface OptionGroup {
  key: string;
  label: string;
  entries: { entry: CatalogEntry; index: number }[];
}

const createAppKey = "create:app";
const createWidgetKey = "create:widget";

const groupEntries = (entries: CatalogEntry[], t: TranslationFunction): OptionGroup[] => {
  const indexed = entries.map((entry, index) => ({ entry, index }));
  const local = indexed.filter(({ entry }) => entry.type !== "app" && entry.type !== "workshop");
  const bestFit = local.filter(({ entry }) => entry.bestFit && entry.connectionStatus !== "needsSetup");
  const widgets = local.filter(({ entry }) => !entry.bestFit && entry.connectionStatus !== "needsSetup");
  const workshop = indexed.filter(({ entry }) => entry.type === "workshop");
  const needsSetup = local.filter(({ entry }) => entry.connectionStatus === "needsSetup");
  const apps = indexed.filter(({ entry }) => entry.type === "app");
  const groups: OptionGroup[] = [];
  if (bestFit.length > 0) groups.push({ key: "best-fit", label: t("item.inPlace.bestFit"), entries: bestFit });
  if (widgets.length > 0) {
    groups.push({
      key: "widgets",
      label: t(bestFit.length > 0 ? "item.inPlace.moreWidgets" : "item.inPlace.widgets"),
      entries: widgets,
    });
  }
  if (needsSetup.length > 0)
    groups.push({ key: "needs-setup", label: t("item.create.connectionStatus.needsSetup"), entries: needsSetup });
  if (workshop.length > 0) groups.push({ key: "workshop", label: t("workshop.title"), entries: workshop });
  if (apps.length > 0) groups.push({ key: "apps", label: t("item.inPlace.yourApps"), entries: apps });
  let index = 0;
  return groups.map((group) => ({
    ...group,
    entries: group.entries.map(({ entry }) => ({ entry, index: index++ })),
  }));
};

export const PickStep = ({ useCatalog, actions, AreaSizeInputs, onKeyDown, flipped, canCreateApp }: PickStepProps) => {
  const t = useI18n();
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useCatalog(search);
  const { data: session } = useSession();
  const canCreateWidget = session?.user.permissions.includes("admin") ?? false;
  const combobox = useCombobox({ opened: true });
  const query = search.trim();
  const creationOptions = [];
  if (query && catalog.entries.length === 0 && !catalog.workshop.isPending) {
    if (canCreateApp)
      creationOptions.push({
        key: createAppKey,
        label: t("item.inPlace.createApp", { name: query }),
        description: t("item.inPlace.addAppLink"),
      });
    if (canCreateWidget) {
      creationOptions.push({
        key: createWidgetKey,
        label: t("item.inPlace.createWidget", { name: query }),
        description: t("item.inPlace.createWidgetDescription"),
      });
    }
  }
  const entriesKey = [...catalog.entries, ...creationOptions].map((entry) => entry.key).join("|");
  const groups = groupEntries(catalog.entries, t);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const syncHighlight = () => {
    requestAnimationFrame(() => {
      const key = listRef.current?.querySelector("[data-combobox-selected]")?.getAttribute("data-entry-key");
      const entry = catalog.entries.find((candidate) => candidate.key === key);
      actions.highlight(entry && entry.type !== "workshop" ? entry.target : undefined);
    });
  };

  useEffect(() => {
    combobox.selectFirstOption();
    syncHighlight();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesKey]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.altKey) {
      onKeyDown(event);
      return;
    }
    if (event.nativeEvent.isComposing || event.shiftKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      combobox.selectNextOption();
      syncHighlight();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      combobox.selectPreviousOption();
      syncHighlight();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      combobox.clickSelectedOption();
    }
  };

  return (
    <Box className={classes.pick} data-flipped={flipped || undefined}>
      <Combobox
        store={combobox}
        onOptionSubmit={(key) => {
          if (key === createAppKey && canCreateApp && query) {
            actions.openCreateApp(query);
            return;
          }
          if (key === createWidgetKey && canCreateWidget && query) {
            window.open(
              `/manage/custom-widgets/new?${new URLSearchParams({ name: query })}`,
              "_blank",
              "noopener,noreferrer",
            );
            return;
          }
          const entry = catalog.entries.find((candidate) => candidate.key === key);
          if (entry?.type === "workshop") actions.openWorkshop(entry.submissionId);
          else if (entry) actions.pick(entry.target);
        }}
      >
        <Box className={classes.search}>
          <Combobox.Target withKeyboardNavigation={false}>
            <TextInput
              ref={inputRef}
              data-autofocus
              data-area-resize-shortcuts
              aria-label={t("item.inPlace.search")}
              size="md"
              radius="md"
              placeholder={t("item.inPlace.search")}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              onKeyDown={handleKeyDown}
            />
          </Combobox.Target>
        </Box>
        <Box
          ref={listRef}
          className={classes.list}
          py="xs"
          px="xs"
          mah={360}
          onMouseLeave={() => actions.highlight(undefined)}
        >
          <Combobox.Options>
            {catalog.entries.length === 0 && creationOptions.length === 0 && !catalog.workshop.isPending && (
              <Combobox.Empty>{t("search.nothingFound")}</Combobox.Empty>
            )}
            {groups.map((group) => (
              <Combobox.Group key={group.key} label={group.label} classNames={{ groupLabel: classes.groupLabel }}>
                {group.entries.map(({ entry, index }) => (
                  <Combobox.Option
                    key={entry.key}
                    value={entry.key}
                    className={classes.option}
                    data-entry-key={entry.key}
                    onMouseEnter={() => {
                      combobox.selectOption(index);
                      actions.highlight(entry.type === "workshop" ? undefined : entry.target);
                    }}
                  >
                    <CatalogOption entry={entry} />
                  </Combobox.Option>
                ))}
              </Combobox.Group>
            ))}
            {creationOptions.map((option, index) => (
              <Combobox.Option
                key={option.key}
                value={option.key}
                className={classes.option}
                data-entry-key={option.key}
                onMouseEnter={() => {
                  combobox.selectOption(index);
                  actions.highlight(undefined);
                }}
              >
                <Group gap="sm" wrap="nowrap">
                  <IconPlus size={19} stroke={1.5} style={{ flexShrink: 0 }} />
                  <Box miw={0}>
                    <Text size="sm" fw={500} truncate>
                      {option.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {option.description}
                    </Text>
                  </Box>
                </Group>
              </Combobox.Option>
            ))}
          </Combobox.Options>
          {catalog.workshop.enabled && (
            <Box px="xs" py="xs">
              {catalog.workshop.isPending && (
                <Group component="output" gap="xs">
                  <Loader size="xs" />
                  <Text size="xs" c="dimmed">
                    {t("item.create.workshop.loading")}
                  </Text>
                </Group>
              )}
              {catalog.workshop.isError && (
                <Text component="output" size="xs" c="dimmed">
                  {t("workshop.unavailableTitle")}
                </Text>
              )}
              {catalog.workshop.integrationError && (
                <Text component="output" size="xs" c="dimmed">
                  {t("item.create.workshop.integrationError")}
                </Text>
              )}
            </Box>
          )}
        </Box>
      </Combobox>
      <Box className={classes.pickFooter}>
        <Group gap={6} justify="space-between" wrap="nowrap">
          <AreaSizeInputs compact />
          <KeyboardHints section="navigation" />
        </Group>
        <KeyboardHints section="geometry" />
      </Box>
    </Box>
  );
};
