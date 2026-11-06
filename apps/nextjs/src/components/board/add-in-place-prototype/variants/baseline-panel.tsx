"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Combobox,
  Group,
  Image,
  Paper,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import { IconArrowLeft, IconPlus, IconSearch, IconX } from "@tabler/icons-react";

import type { CatalogEntry } from "../catalog";
import type { AddInPlacePanelProps } from "./contract";

const panelWidth = 360;

const stickyFooterStyle: CSSProperties = {
  position: "sticky",
  bottom: "calc(var(--mantine-spacing-sm) * -1)",
  margin: "0 calc(var(--mantine-spacing-sm) * -1) calc(var(--mantine-spacing-sm) * -1)",
  padding: "var(--mantine-spacing-xs) var(--mantine-spacing-sm)",
  background: "var(--mantine-color-body)",
  borderTop: "1px solid var(--mantine-color-default-border)",
  zIndex: 1,
};

const viewportMargin = 16;
const minPanelHeight = 280;

const getFloatingStyle = (anchorRect: DOMRect | null): CSSProperties => {
  const base: CSSProperties = {
    position: "fixed",
    zIndex: 251,
    width: panelWidth,
    overflowY: "auto",
  };
  if (!anchorRect) return { ...base, right: 16, bottom: 16, maxHeight: `calc(100dvh - ${viewportMargin * 2}px)` };
  const left = Math.min(Math.max(8, anchorRect.left), Math.max(8, window.innerWidth - panelWidth - 8));
  const spaceAbove = anchorRect.top - 8 - viewportMargin;
  const spaceBelow = window.innerHeight - anchorRect.bottom - 8 - viewportMargin;
  if (spaceBelow >= minPanelHeight || spaceBelow >= spaceAbove) {
    return { ...base, left, top: anchorRect.bottom + 8, maxHeight: Math.max(spaceBelow, minPanelHeight) };
  }
  return {
    ...base,
    left,
    bottom: window.innerHeight - anchorRect.top + 8,
    maxHeight: Math.max(spaceAbove, minPanelHeight),
  };
};

const EntryIcon = ({ entry }: { entry: CatalogEntry }) => {
  if (entry.type === "app") {
    return entry.iconUrl ? <Image src={entry.iconUrl} w={20} h={20} fit="contain" alt="" /> : <IconPlus size={18} />;
  }
  const Icon = entry.icon;
  return <Icon size={20} stroke={1.5} />;
};

const PickStep = ({ useCatalog, actions }: Pick<AddInPlacePanelProps, "useCatalog" | "actions">) => {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useCatalog(search);
  const combobox = useCombobox({ opened: true });
  const entriesKey = catalog.entries.map((entry) => entry.key).join("|");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const syncHighlight = () => {
    requestAnimationFrame(() => {
      const key = listRef.current?.querySelector("[data-combobox-selected]")?.getAttribute("data-entry-key");
      const entry = catalog.entries.find((candidate) => candidate.key === key);
      actions.highlight(entry?.target);
    });
  };

  useEffect(() => {
    combobox.selectFirstOption();
    syncHighlight();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesKey]);

  const hasWidgets = catalog.entries.some((entry) => entry.type !== "app");
  const hasApps = catalog.entries.some((entry) => entry.type === "app");

  return (
    <Stack gap="xs">
      <Combobox
        store={combobox}
        onOptionSubmit={(key) => {
          const entry = catalog.entries.find((candidate) => candidate.key === key);
          if (entry) actions.pick(entry.target);
        }}
      >
        <Combobox.EventsTarget>
          <TextInput
            ref={inputRef}
            data-autofocus
            placeholder="Search widgets and apps"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") syncHighlight();
            }}
          />
        </Combobox.EventsTarget>
        <div ref={listRef} onMouseLeave={() => actions.highlight(undefined)}>
          <Combobox.Options>
            {catalog.entries.length === 0 && <Combobox.Empty>Nothing found</Combobox.Empty>}
            {catalog.entries.map((entry, index) => (
              <div key={entry.key}>
                {hasWidgets && hasApps && entry.type === "app" && catalog.entries[index - 1]?.type !== "app" && (
                  <Text size="xs" c="dimmed" px="xs" pt="xs" pb={2}>
                    Your apps
                  </Text>
                )}
                <Combobox.Option
                  value={entry.key}
                  data-entry-key={entry.key}
                  onMouseEnter={() => actions.highlight(entry.target)}
                >
                  <Group gap="sm" wrap="nowrap">
                    <EntryIcon entry={entry} />
                    <Text size="sm" truncate style={{ flex: 1 }}>
                      {entry.name}
                    </Text>
                    {entry.bestFit && entry.type !== "app" && (
                      <Badge size="xs" variant="light">
                        Best fit
                      </Badge>
                    )}
                    {entry.connectionStatus === "needsSetup" && (
                      <Badge size="xs" variant="light" color="gray">
                        Needs setup
                      </Badge>
                    )}
                  </Group>
                </Combobox.Option>
              </div>
            ))}
          </Combobox.Options>
        </div>
      </Combobox>
      {catalog.total > catalog.entries.length && (
        <Text size="xs" c="dimmed">
          Showing {catalog.entries.length} of {catalog.total}. Type to narrow down.
        </Text>
      )}
      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={() => actions.openCreateApp()}
        data-add-in-place-create-app=""
      >
        Create app
      </Button>
    </Stack>
  );
};

export const BaselinePanel = (props: AddInPlacePanelProps) => {
  const { step, session, anchorRect, presentation, actions, BoundEditorForm, AreaSizeInputs, CreateAppForm } = props;
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const isEdit = session.mode === "edit";

  useEffect(() => {
    setConfirmDiscard(false);
  }, [step]);

  const requestBack = () => {
    if (session.dirty && step === "configure") {
      setConfirmDiscard(true);
      return;
    }
    actions.back();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && session.dirty && step === "configure") {
      event.preventDefault();
      event.stopPropagation();
      setConfirmDiscard(true);
      return;
    }
    props.onKeyDown(event);
  };

  const titles = {
    pick: "Add widget",
    configure: isEdit ? "Edit widget" : "Configure widget",
    createApp: "Create app",
  } as const;

  return (
    <Paper
      {...props.panelProps}
      withBorder
      shadow={presentation === "floating" ? "lg" : undefined}
      radius="md"
      p="sm"
      style={presentation === "floating" ? getFloatingStyle(anchorRect) : undefined}
      onKeyDown={handleKeyDown}
    >
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            {step !== "pick" && !isEdit && (
              <ActionIcon variant="subtle" color="gray" onClick={requestBack} aria-label="Back">
                <IconArrowLeft size={16} />
              </ActionIcon>
            )}
            <Text fw={600} size="sm">
              {titles[step]}
            </Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <AreaSizeInputs />
            <ActionIcon variant="subtle" color="gray" onClick={() => actions.cancel()} aria-label="Close">
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Group>
        {step === "pick" && <PickStep useCatalog={props.useCatalog} actions={actions} />}
        {step === "configure" && (
          <>
            <BoundEditorForm />
            <div style={stickyFooterStyle}>
              {confirmDiscard ? (
                <Group justify="space-between">
                  <Text size="sm">Discard changes?</Text>
                  <Group gap="xs">
                    <Button variant="default" size="xs" onClick={() => setConfirmDiscard(false)}>
                      Keep editing
                    </Button>
                    <Button color="red" size="xs" onClick={() => actions.back()}>
                      Discard
                    </Button>
                  </Group>
                </Group>
              ) : (
                <Group justify="flex-end" gap="xs">
                  <Button variant="default" onClick={requestBack}>
                    Cancel
                  </Button>
                  <Button type="submit" form={props.editorFormId}>
                    {isEdit ? "Save" : "Add"}
                  </Button>
                </Group>
              )}
            </div>
          </>
        )}
        {step === "createApp" && <CreateAppForm />}
      </Stack>
    </Paper>
  );
};
