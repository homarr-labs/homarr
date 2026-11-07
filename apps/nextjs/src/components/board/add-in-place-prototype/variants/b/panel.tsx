"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Combobox,
  Image,
  Kbd,
  Tabs as MantineTabs,
  Text,
  TextInput,
  Transition,
  UnstyledButton,
  useCombobox,
} from "@mantine/core";
import { IconAppWindow, IconArrowLeft, IconEyeOff, IconPlus, IconSearch, IconX } from "@tabler/icons-react";

import { getIconUrl } from "@homarr/definitions";

import type { CatalogEntry } from "../../catalog";
import type { AddInPlacePanelProps } from "../contract";
import { CatalogOption } from "./catalog-option";
import classes from "./inspector.module.css";

const sidebarWidth = 400;

const EntryIcon = ({ entry }: { entry: CatalogEntry }) => {
  if (entry.type === "app") {
    if (!entry.iconUrl) return <IconAppWindow size={20} stroke={1.5} />;
    return <Image src={entry.iconUrl} w={24} h={24} fit="contain" alt="" />;
  }
  const Icon = entry.icon;
  return <Icon size={22} stroke={1.5} />;
};

const EntryBadges = ({ entry }: { entry: CatalogEntry }) => {
  const integrations = entry.supportedIntegrations.slice(0, 3);
  return (
    <>
      {entry.type !== "app" && entry.bestFit && (
        <Badge size="xs" variant="light">
          Best fit
        </Badge>
      )}
      {entry.connectionStatus === "needsSetup" && (
        <Badge size="xs" variant="light" color="gray">
          Needs setup
        </Badge>
      )}
      {entry.connectionStatus === "ready" && integrations.length > 0 && (
        <Avatar.Group spacing="xs">
          {integrations.map((kind) => (
            <Avatar key={kind} src={getIconUrl(kind)} size={16} radius="xl" />
          ))}
        </Avatar.Group>
      )}
    </>
  );
};

interface PickStepProps extends Pick<AddInPlacePanelProps, "useCatalog" | "actions" | "onKeyDown" | "canCreateApp"> {
  presentation: AddInPlacePanelProps["presentation"];
}

const PickStep = ({ useCatalog, actions, onKeyDown, presentation, canCreateApp }: PickStepProps) => {
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useCatalog(search);
  const combobox = useCombobox({ opened: true });
  const entriesKey = catalog.entries.map((entry) => entry.key).join("|");
  const widgets = catalog.entries.filter((entry) => entry.type !== "app");
  const apps = catalog.entries.filter((entry) => entry.type === "app");

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

  const renderGroup = (label: string, entries: CatalogEntry[]): ReactNode => {
    if (entries.length === 0) return null;
    return (
      <div role="presentation">
        <div className={classes.groupLabel}>
          <span>{label}</span>
          <span>{entries.length}</span>
        </div>
        {entries.map((entry) => (
          <CatalogOption
            key={entry.key}
            value={entry.key}
            data-entry-key={entry.key}
            name={entry.name}
            description={entry.description}
            icon={<EntryIcon entry={entry} />}
            badges={<EntryBadges entry={entry} />}
            sizeLabel={`${entry.defaultSize.width}×${entry.defaultSize.height}`}
            onMouseEnter={() => actions.highlight(entry.target)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={classes.stageContent}>
      <Combobox
        store={combobox}
        onOptionSubmit={(key) => {
          const entry = catalog.entries.find((candidate) => candidate.key === key);
          if (entry) actions.pick(entry.target);
        }}
      >
        <div className={classes.searchWrap}>
          <Combobox.EventsTarget>
            <TextInput
              ref={inputRef}
              data-autofocus
              size="md"
              placeholder="Search widgets and apps"
              leftSection={<IconSearch size={18} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              onKeyDown={(event) => {
                onKeyDown(event);
                if (event.key === "ArrowDown" || event.key === "ArrowUp") syncHighlight();
              }}
            />
          </Combobox.EventsTarget>
        </div>
        <div ref={listRef} className={classes.list} onMouseLeave={() => actions.highlight(undefined)}>
          <Combobox.Options>
            {catalog.entries.length === 0 && <div className={classes.empty}>Nothing found for “{search}”</div>}
            {renderGroup("Widgets", widgets)}
            {renderGroup("Apps", apps)}
          </Combobox.Options>
          {catalog.total > catalog.entries.length && (
            <div className={classes.more}>
              Showing {catalog.entries.length} of {catalog.total}. Type to narrow down.
            </div>
          )}
        </div>
      </Combobox>
      <div className={classes.footer}>
        {canCreateApp && (
          <UnstyledButton
            className={classes.createApp}
            onClick={() => actions.openCreateApp()}
            data-add-in-place-create-app=""
          >
            <IconPlus size={18} />
            Create app
          </UnstyledButton>
        )}
        {presentation === "floating" && (
          <div className={classes.hints}>
            <span className={classes.kbd}>
              <Kbd size="xs">↑</Kbd>
              <Kbd size="xs">↓</Kbd> preview
            </span>
            <span className={classes.kbd}>
              <Kbd size="xs">Enter</Kbd> pick
            </span>
            <span className={classes.kbd}>
              <Kbd size="xs">Alt+Shift</Kbd>
              <Kbd size="xs">←↑↓→</Kbd> resize
            </span>
            <span className={classes.kbd}>
              <Kbd size="xs">Esc</Kbd> close
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const sectionTabs = [
  { value: "options", label: "Options" },
  { value: "integrations", label: "Integrations" },
  { value: "appearance", label: "Appearance" },
] as const;

type SectionTab = (typeof sectionTabs)[number]["value"];

const scrollToSection = (scroller: HTMLElement | null, section: SectionTab) => {
  if (!scroller) return;
  const form = scroller.querySelector("form");
  if (section === "options") {
    scroller.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (section === "integrations") {
    const target = form?.querySelector("[class*=fullWidthField]") ?? form;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const accordion = form?.querySelector<HTMLElement>(".mantine-Accordion-root");
  const control = accordion?.querySelector<HTMLButtonElement>(".mantine-Accordion-control");
  if (control?.getAttribute("aria-expanded") === "false") control.click();
  accordion?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export const Panel = (props: AddInPlacePanelProps) => {
  const { step, session, anchorRect, presentation, actions, BoundEditorForm, AreaSizeInputs, CreateAppForm } = props;
  const isEdit = session.mode === "edit";
  const isSheet = presentation === "sheet";
  const [entered, setEntered] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [section, setSection] = useState<SectionTab>("options");
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    setConfirmDiscard(false);
    setSection("options");
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

  const { area } = session;
  const summary = `${area.w}×${area.h} · column ${area.x + 1}, row ${area.y + 1} · Main canvas`;
  const behindPanel = !isSheet && anchorRect !== null && anchorRect.right > window.innerWidth - sidebarWidth;
  const picked = session.picked;
  const pickedName = picked && "name" in picked ? picked.name : undefined;
  const titles = {
    pick: "New widget",
    configure: isEdit ? "Edit widget" : `Configure ${pickedName ?? "widget"}`,
    createApp: "Create app",
  } as const;

  const header = (
    <div className={classes.header}>
      <div className={classes.titleRow}>
        <div>
          {step !== "pick" && !isEdit && (
            <Button
              variant="subtle"
              color="gray"
              size="compact-xs"
              px={4}
              mb={4}
              leftSection={<IconArrowLeft size={12} />}
              onClick={requestBack}
            >
              Back to widgets
            </Button>
          )}
          <div className={classes.title}>{titles[step]}</div>
          <div className={classes.summary}>{summary}</div>
        </div>
        <ActionIcon variant="subtle" color="gray" onClick={() => actions.cancel()} aria-label="Close">
          <IconX size={18} />
        </ActionIcon>
      </div>
      <div className={classes.sizeRow}>
        <span className={classes.sizeLabel}>Size</span>
        <AreaSizeInputs />
      </div>
      {behindPanel && (
        <Badge className={classes.hint} variant="light" color="yellow" leftSection={<IconEyeOff size={12} />}>
          Selected area is behind the panel
        </Badge>
      )}
    </div>
  );

  const configureBody = (
    <>
      <Tabs
        section={section}
        onChange={(value) => {
          setSection(value);
          scrollToSection(scrollerRef.current, value);
        }}
      />
      <div ref={scrollerRef} className={classes.scroll}>
        <BoundEditorForm />
      </div>
      <div className={classes.actionBar}>
        {confirmDiscard && (
          <div className={classes.discard}>
            <Text size="sm">Discard changes?</Text>
            <div>
              <Button variant="default" size="xs" mr="xs" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
              <Button color="red" size="xs" onClick={() => actions.back()}>
                Discard
              </Button>
            </div>
          </div>
        )}
        {!confirmDiscard && (
          <>
            <Button variant="default" onClick={requestBack}>
              Cancel
            </Button>
            <Button type="submit" form={props.editorFormId}>
              {isEdit ? "Save" : "Add"}
            </Button>
          </>
        )}
      </div>
    </>
  );

  const content = (
    <StepFade key={step}>
      {step === "pick" && (
        <PickStep
          useCatalog={props.useCatalog}
          canCreateApp={props.canCreateApp}
          actions={actions}
          onKeyDown={props.onKeyDown}
          presentation={presentation}
        />
      )}
      {step === "configure" && configureBody}
      {step === "createApp" && (
        <div className={classes.scroll}>
          <CreateAppForm />
        </div>
      )}
    </StepFade>
  );

  if (isSheet) {
    return (
      <dialog
        open
        {...props.panelProps}
        aria-label="Widget inspector"
        tabIndex={-1}
        className={classes.sheet}
        onKeyDown={handleKeyDown}
      >
        {header}
        <div className={classes.stage}>{content}</div>
      </dialog>
    );
  }

  return (
    <Transition mounted={entered} transition="slide-left" duration={220} timingFunction="ease-out">
      {(styles) => (
        <dialog
          open
          {...props.panelProps}
          tabIndex={-1}
          className={classes.sidebar}
          style={styles}
          aria-label="Widget inspector"
          onKeyDown={handleKeyDown}
        >
          {header}
          <div className={classes.stage}>{content}</div>
        </dialog>
      )}
    </Transition>
  );
};

const Tabs = ({ section, onChange }: { section: SectionTab; onChange: (value: SectionTab) => void }) => (
  <MantineTabs
    className={classes.tabs}
    value={section}
    onChange={(value) => {
      const next = sectionTabs.find((tab) => tab.value === value);
      if (next) onChange(next.value);
    }}
  >
    <MantineTabs.List grow>
      {sectionTabs.map((tab) => (
        <MantineTabs.Tab key={tab.value} value={tab.value}>
          {tab.label}
        </MantineTabs.Tab>
      ))}
    </MantineTabs.List>
  </MantineTabs>
);

const StepFade = ({ children }: { children: ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Transition mounted={mounted} transition="fade" duration={160}>
      {(styles) => (
        <div className={classes.stageContent} style={styles}>
          {children}
        </div>
      )}
    </Transition>
  );
};
