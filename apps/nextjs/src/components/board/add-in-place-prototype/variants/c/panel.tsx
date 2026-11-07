"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Combobox,
  Group,
  Image,
  Paper,
  Text,
  TextInput,
  Transition,
  UnstyledButton,
  useCombobox,
} from "@mantine/core";
import { IconArrowLeft, IconPlus, IconSearch, IconX } from "@tabler/icons-react";

import { getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";

import type { CatalogEntry } from "../../catalog";
import { getTargetKind } from "../../store";
import type { PickTarget } from "../../types";
import type { AddInPlacePanelProps } from "../contract";
import { GalleryCard } from "./gallery-card";
import type { GalleryCardMarker } from "./gallery-card";
import classes from "./panel.module.css";

const maxWidth = 720;
const viewportMargin = 12;
const gap = 10;
const createKey = "__create-app__";
const accents = ["blue", "violet", "teal", "orange", "grape", "cyan", "pink", "indigo", "lime", "red"];
const presets = [
  { w: 1, h: 1 },
  { w: 2, h: 1 },
  { w: 2, h: 2 },
  { w: 4, h: 2 },
  { w: 4, h: 4 },
];

const getAccent = (entry: CatalogEntry) => {
  if (entry.type === "app") return "gray";
  let hash = 0;
  for (const char of entry.key) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return accents[hash % accents.length] ?? "blue";
};

const getFloatingStyle = (
  anchorRect: DOMRect | null,
  step: AddInPlacePanelProps["step"],
  height: number,
): CSSProperties => {
  const width = Math.min(maxWidth, window.innerWidth - viewportMargin * 2);
  const base: CSSProperties = { position: "fixed", zIndex: 251, width };
  if (!anchorRect) {
    return { ...base, left: (window.innerWidth - width) / 2, bottom: 24, maxHeight: window.innerHeight - 48 };
  }
  const center = anchorRect.left + anchorRect.width / 2;
  const left = Math.min(Math.max(viewportMargin, center - width / 2), window.innerWidth - width - viewportMargin);
  const spaceBelow = window.innerHeight - anchorRect.bottom - gap - viewportMargin;
  const spaceAbove = anchorRect.top - gap - viewportMargin;
  const needed = Math.min(height || 300, 460);
  const preferAbove = step === "configure" || step === "createApp";
  const placeAbove = preferAbove
    ? spaceAbove >= needed || spaceAbove > spaceBelow
    : spaceBelow < needed && spaceAbove > spaceBelow;
  if (placeAbove) {
    return { ...base, left, bottom: window.innerHeight - anchorRect.top + gap, maxHeight: Math.max(spaceAbove, 240) };
  }
  return { ...base, left, top: anchorRect.bottom + gap, maxHeight: Math.max(spaceBelow, 240) };
};

const EntryVisual = ({ entry, big }: { entry: CatalogEntry; big: boolean }) => {
  if (entry.type === "app") {
    return entry.iconUrl ? (
      <Image src={entry.iconUrl} w={big ? 40 : 28} h={big ? 40 : 28} fit="contain" alt="" />
    ) : (
      <IconPlus size={24} />
    );
  }
  const Icon = entry.icon;
  return <Icon size={big ? 36 : 24} stroke={1.5} />;
};

const getMarker = (entry: CatalogEntry, area: { w: number; h: number }): GalleryCardMarker => {
  if (entry.connectionStatus === "needsSetup") return "setup";
  if (entry.bestFit && entry.type !== "app") return "bestFit";
  if (entry.defaultSize.width <= area.w && entry.defaultSize.height <= area.h) return "fits";
  return "larger";
};

const StepTransition = ({ children }: { children: ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <Transition mounted={mounted} transition="fade-up" duration={200} timingFunction="ease">
      {(style) => <div style={style}>{children}</div>}
    </Transition>
  );
};

const SizeRow = ({
  area,
  presentation,
  AreaSizeInputs,
  actions,
  withClose,
}: Pick<AddInPlacePanelProps, "presentation" | "AreaSizeInputs" | "actions"> & {
  area: { w: number; h: number };
  withClose: boolean;
}) => (
  <div className={classes.sizeRow}>
    <span className={classes.sizeLabel}>Size</span>
    <div className={classes.chips}>
      {presets.map((preset) => {
        const active = preset.w === area.w && preset.h === area.h;
        return (
          <UnstyledButton
            key={`${preset.w}x${preset.h}`}
            className={classes.chip}
            data-active={active || undefined}
            aria-pressed={active}
            onClick={() => actions.resizeTo(preset.w, preset.h)}
          >
            <span className={classes.glyphBox}>
              <span
                className={classes.glyph}
                style={{ width: 4 + preset.w * 3, height: 4 + preset.h * 3, maxWidth: 20, maxHeight: 20 }}
              />
            </span>
            {preset.w}×{preset.h}
          </UnstyledButton>
        );
      })}
    </div>
    {presentation === "floating" && <AreaSizeInputs />}
    {withClose && (
      <ActionIcon variant="subtle" color="gray" radius="xl" onClick={() => actions.cancel()} aria-label="Close">
        <IconX size={16} />
      </ActionIcon>
    )}
  </div>
);

const Hints = ({ mode }: { mode: "pick" | "configure" }) => (
  <div className={classes.hints}>
    {mode === "pick" && (
      <>
        <span>
          <span className={classes.kbd}>←→</span>browse
        </span>
        <span>
          <span className={classes.kbd}>Enter</span>pick
        </span>
      </>
    )}
    {mode === "configure" && (
      <span>
        <span className={classes.kbd}>⌘↵</span>add
      </span>
    )}
    <span>
      <span className={classes.kbd}>Alt+Shift+↑↓←→</span>resize
    </span>
    <span>
      <span className={classes.kbd}>Esc</span>back
    </span>
  </div>
);

const PickStep = ({
  presentation,
  session,
  useCatalog,
  actions,
  AreaSizeInputs,
  canCreateApp,
}: Pick<
  AddInPlacePanelProps,
  "presentation" | "session" | "useCatalog" | "actions" | "AreaSizeInputs" | "canCreateApp"
>) => {
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const catalog = useCatalog(search);
  const combobox = useCombobox();
  const entries = catalog.entries;
  const entriesKey = entries.map((entry) => entry.key).join("|");
  const optionCount = entries.length + Number(canCreateApp);
  const base = session.baseArea;
  const isSheet = presentation === "sheet";

  const widgets = useMemo(() => entries.filter((entry) => entry.type !== "app"), [entries]);
  const apps = useMemo(() => entries.filter((entry) => entry.type === "app"), [entries]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [entriesKey, canCreateApp]);

  useEffect(() => {
    const entry = entries[activeIndex];
    actions.highlight(entry?.target);
    combobox.selectOption(activeIndex);
    const key = entry?.key ?? createKey;
    const node = galleryRef.current?.querySelector(`[data-entry-key="${CSS.escape(key)}"]`);
    node?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, entriesKey, base.w, base.h]);

  const move = (delta: number) => {
    if (optionCount === 0) return;
    setActiveIndex((current) => (current + delta + optionCount) % optionCount);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const input = event.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    if (event.key === "ArrowDown" || (event.key === "ArrowRight" && atEnd)) {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === "ArrowUp" || (event.key === "ArrowLeft" && atStart)) {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      combobox.clickSelectedOption();
    }
  };

  const submit = (key: string) => {
    if (key === createKey) {
      if (canCreateApp) actions.openCreateApp();
      return;
    }
    const entry = entries.find((candidate) => candidate.key === key);
    if (entry) actions.pick(entry.target);
  };

  const orientation = isSheet ? "horizontal" : "vertical";

  const renderCard = (entry: CatalogEntry) => {
    const index = entries.indexOf(entry);
    const big = entry.defaultSize.width > 1 || entry.defaultSize.height > 1;
    return (
      <Combobox.Option
        key={entry.key}
        value={entry.key}
        data-entry-key={entry.key}
        onMouseEnter={() => setActiveIndex(index)}
        style={{
          display: "flex",
          padding: 0,
          background: "transparent",
          borderRadius: 18,
          flex: isSheet ? undefined : "0 0 auto",
        }}
      >
        <GalleryCard
          name={entry.name}
          description={entry.description}
          icon={<EntryVisual entry={entry} big={big} />}
          tileWidth={entry.defaultSize.width}
          tileHeight={entry.defaultSize.height}
          accent={getAccent(entry)}
          selected={index === activeIndex}
          marker={getMarker(entry, base)}
          orientation={orientation}
        />
      </Combobox.Option>
    );
  };

  return (
    <Combobox store={combobox} onOptionSubmit={submit}>
      <div className={classes.section}>
        <SizeRow
          area={base}
          presentation={presentation}
          AreaSizeInputs={AreaSizeInputs}
          actions={actions}
          withClose={true}
        />
        <Combobox.EventsTarget withKeyboardNavigation={false}>
          <TextInput
            ref={inputRef}
            data-autofocus
            size="sm"
            radius="xl"
            placeholder="Search widgets and apps"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
        </Combobox.EventsTarget>
        <Combobox.Options>
          <div ref={galleryRef} className={classes.gallery} data-presentation={presentation}>
            {entries.length === 0 && <div className={classes.empty}>Nothing found</div>}
            {widgets.length > 0 && (
              <div className={classes.group} data-presentation={presentation}>
                <span className={classes.groupLabel}>Widgets</span>
                <div className={classes.groupCards}>{widgets.map(renderCard)}</div>
              </div>
            )}
            {apps.length > 0 && (
              <div className={classes.group} data-presentation={presentation}>
                <span className={classes.groupLabel}>Your apps</span>
                <div className={classes.groupCards}>{apps.map(renderCard)}</div>
              </div>
            )}
            {canCreateApp && (
              <div className={classes.group} data-presentation={presentation}>
                <span className={classes.groupLabel}>New</span>
                <div className={classes.groupCards}>
                  <Combobox.Option
                    value={createKey}
                    data-entry-key={createKey}
                    data-add-in-place-create-app=""
                    onMouseEnter={() => setActiveIndex(entries.length)}
                    style={{ display: "flex", padding: 0, background: "transparent", borderRadius: 18 }}
                  >
                    <GalleryCard
                      name="Create app"
                      description="Add a new app link"
                      icon={<IconPlus size={24} />}
                      tileWidth={1}
                      tileHeight={1}
                      accent="blue"
                      selected={activeIndex === entries.length}
                      orientation={orientation}
                    />
                  </Combobox.Option>
                </div>
              </div>
            )}
          </div>
        </Combobox.Options>
        {catalog.total > entries.length && (
          <Text size="xs" c="dimmed">
            Showing {entries.length} of {catalog.total}. Type to narrow down.
          </Text>
        )}
        {!isSheet && <Hints mode="pick" />}
      </div>
    </Combobox>
  );
};

const getTargetName = (target: PickTarget | undefined, t: ReturnType<typeof useI18n>) => {
  if (!target) return "Widget";
  if (target.type === "custom" || target.type === "app") return target.name;
  return getWidgetName(target.kind, t);
};

const ConfigureStep = ({
  props,
  confirmDiscard,
  setConfirmDiscard,
  requestBack,
}: {
  props: AddInPlacePanelProps;
  confirmDiscard: boolean;
  setConfirmDiscard: (value: boolean) => void;
  requestBack: () => void;
}) => {
  const { session, presentation, actions, BoundEditorForm, AreaSizeInputs, editorFormId } = props;
  const t = useI18n();
  const isEdit = session.mode === "edit";
  const target = session.picked;
  const Icon = target ? widgetCatalogIcons[getTargetKind(target)] : widgetCatalogIcons.app;
  const isSheet = presentation === "sheet";

  return (
    <>
      <div className={classes.configHeader}>
        {!isEdit && (
          <ActionIcon variant="subtle" color="gray" radius="xl" onClick={requestBack} aria-label="Back">
            <IconArrowLeft size={18} />
          </ActionIcon>
        )}
        <div className={classes.configTile}>
          <Icon size={26} stroke={1.5} />
        </div>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <div className={classes.configTitle}>{getTargetName(target, t)}</div>
          <Text size="xs" c="dimmed">
            {isEdit ? "Edit widget" : "Configure widget"}
          </Text>
        </Box>
        <Badge size="lg" variant="light" radius="xl">
          {session.area.w}×{session.area.h}
        </Badge>
        {!isSheet && <AreaSizeInputs />}
        <ActionIcon variant="subtle" color="gray" radius="xl" onClick={() => actions.cancel()} aria-label="Close">
          <IconX size={16} />
        </ActionIcon>
      </div>
      <div className={classes.configBody}>
        {isSheet && (
          <Box mb="sm">
            <AreaSizeInputs />
          </Box>
        )}
        <div className={classes.configColumns} data-presentation={presentation} data-wide="">
          <BoundEditorForm />
        </div>
      </div>
      <div className={classes.configFooter}>
        {confirmDiscard ? (
          <>
            <Text size="sm">Discard changes?</Text>
            <Group gap="xs">
              <Button variant="default" radius="xl" size="xs" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
              <Button color="red" radius="xl" size="xs" onClick={() => actions.back()}>
                Discard
              </Button>
            </Group>
          </>
        ) : (
          <>
            {isSheet ? <span /> : <Hints mode="configure" />}
            <Group gap="xs" wrap="nowrap">
              <Button variant="default" radius="xl" onClick={requestBack}>
                Cancel
              </Button>
              <Button type="submit" form={editorFormId} className={classes.primary}>
                {isEdit ? "Save" : "Add Widget"}
              </Button>
            </Group>
          </>
        )}
      </div>
    </>
  );
};

export const GalleryPanel = (props: AddInPlacePanelProps) => {
  const { step, session, anchorRect, presentation, actions, CreateAppForm } = props;
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [height, setHeight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const isEdit = session.mode === "edit";

  useEffect(() => {
    setConfirmDiscard(false);
  }, [step]);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

  const floatingStyle = presentation === "floating" ? getFloatingStyle(anchorRect, step, height) : undefined;

  return (
    <Paper
      {...props.panelProps}
      ref={rootRef}
      className={classes.panel}
      data-presentation={presentation}
      style={floatingStyle}
      onKeyDown={handleKeyDown}
    >
      <StepTransition key={step}>
        {step === "pick" && !isEdit && (
          <PickStep
            presentation={presentation}
            canCreateApp={props.canCreateApp}
            session={session}
            useCatalog={props.useCatalog}
            actions={actions}
            AreaSizeInputs={props.AreaSizeInputs}
          />
        )}
        {step === "configure" && (
          <div style={{ display: "flex", flexDirection: "column", maxHeight: floatingStyle?.maxHeight }}>
            <ConfigureStep
              props={props}
              confirmDiscard={confirmDiscard}
              setConfirmDiscard={setConfirmDiscard}
              requestBack={requestBack}
            />
          </div>
        )}
        {step === "createApp" && (
          <div className={classes.section} style={{ overflowY: "auto", maxHeight: floatingStyle?.maxHeight }}>
            <Group gap="xs">
              <ActionIcon variant="subtle" color="gray" radius="xl" onClick={() => actions.back()} aria-label="Back">
                <IconArrowLeft size={18} />
              </ActionIcon>
              <Text fw={700} size="lg">
                Create app
              </Text>
            </Group>
            <CreateAppForm />
          </div>
        )}
      </StepTransition>
    </Paper>
  );
};
