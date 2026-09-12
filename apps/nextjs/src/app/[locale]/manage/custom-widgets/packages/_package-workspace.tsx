"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Group,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
  ActionIcon,
  Paper,
} from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp, IconInfoCircle } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { PackageOptionFields } from "@homarr/widgets/custom-api/package-option-fields";
import { PackagePreview } from "./_package-preview";
import { PackageAssistant, usePackageAssistant } from "./_package-assistant";
import { PackageSourceEditor } from "./_package-source-editor";
import { PackageConnections } from "./_package-connections";
import { PackageOperations } from "./_package-operations";
import { PackageWorkshop, PackageTransfer } from "./_package-workshop";
import { usePackageWorkspace } from "./_use-package-workspace";
import type { Installation } from "./_use-package-workspace";
import classes from "./_package-workspace.module.css";
import type { CSSProperties, PropsWithChildren, ReactNode } from "react";

const workspaceTabs = ["source", "connections", "options", "installation", "workshop"] as const;
type WorkspaceTab = (typeof workspaceTabs)[number];
const isWorkspaceTab = (value: string | null): value is WorkspaceTab => workspaceTabs.some((tab) => tab === value);

export function PackageWorkspace({
  installation,
  userId,
  initialSource,
  initialName,
  initialBindings,
  initialBoardId,
}: {
  installation?: Installation;
  userId: string;
  initialSource?: unknown;
  initialName?: string;
  initialBindings?: Record<string, string>;
  initialBoardId?: string;
}) {
  const t = useI18n("customWidget.package");
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<WorkspaceTab>(() => {
    const requested = searchParams.get("tab");
    if (isWorkspaceTab(requested)) return requested;
    return "source";
  });
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([tab]));
  const selectTab = (value: string | null) => {
    if (!isWorkspaceTab(value)) return;
    setVisitedTabs((current) => new Set(current).add(value));
    setTab(value);
  };
  const workspace = usePackageWorkspace(
    installation,
    userId,
    initialSource,
    initialName,
    initialBindings,
    initialBoardId,
  );
  const {
    editor,
    document,
    edit,
    pane,
    setPane,
    trusted,
    error,
    setError,
    message,
    setMessage,
    bindings,
    setBindings,
    setOptions,
    parsed,
    effectiveOptions,
    save,
    saveBindings,
    busy,
    saveDraft,
    saveLocalBindings,
  } = workspace;
  usePackageAssistant(workspace);
  const current = workspace.installation;
  let status = t("draftOnly");
  if (current?.activeArtifactId) status = t("disabled");
  if (current?.activeArtifactId && current.enabled) status = t("active");
  let draftStatus = t("saved");
  if (editor.dirty) draftStatus = t("unsaved");
  if (!workspace.installationId) draftStatus = t("notSaved");

  return (
    <Stack
      gap="sm"
      onKeyDownCapture={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.closest("[data-package-document]") || busy) return;
        if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z" || event.altKey) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) editor.redo();
        else editor.undo();
      }}
    >
      <Group justify="space-between" align="end" data-package-document>
        <TextInput
          flex={1}
          maw={440}
          label={t("name")}
          value={document.name}
          disabled={busy}
          onChange={(event) => edit({ ...document, name: event.currentTarget.value }, "name")}
        />
        <Group gap="xs">
          <Button variant="subtle" component={Link} href="/manage/custom-widgets/packages">
            {t("library")}
          </Button>
          <Badge variant="light">{status}</Badge>
          <Text size="xs" c="dimmed">{draftStatus}</Text>
          <Button
            variant="default"
            loading={save.isPending}
            disabled={!document.name.trim() || busy}
            onClick={() => void saveDraft()}
          >
            {t("saveDraft")}
          </Button>
          <Button onClick={() => { selectTab("installation"); setPane("edit"); }}>
            {t("installation")}
          </Button>
        </Group>
      </Group>
      {!workspace.installationId && (
        <Paper withBorder p="md">
          <Stack gap="xs">
            <Text fw={600}>{t("gettingStarted")}</Text>
            <Text size="sm" c="dimmed">{t("gettingStartedDescription")}</Text>
            <Text size="sm">{t("manualSteps")}</Text>
          </Stack>
        </Paper>
      )}
      {error && (
        <Alert color="red" withCloseButton onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert color="blue" withCloseButton onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}
      {workspace.bindingsDirty && (
        <Alert color="yellow">
          <Group justify="space-between">
            <Text size="sm">{t("connectionsUnsaved")}</Text>
            <Button size="xs" loading={saveBindings.isPending || save.isPending} disabled={busy} onClick={saveLocalBindings}>
              {t("saveBindings")}
            </Button>
          </Group>
        </Alert>
      )}
      {editor.recovery && (
        <Alert color="yellow">
          <Stack gap="xs">
            <Text>{t("recovery")}</Text>
            <Group>
              <Button size="xs" onClick={editor.restoreRecovery}>
                {t("restore")}
              </Button>
              <Button size="xs" variant="subtle" onClick={editor.discardRecovery}>
                {t("discard")}
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}
      <Group gap="xs">
        <PackageAssistant />
        <Button
          size="xs"
          variant="default"
          leftSection={<IconArrowBackUp size={14} />}
          disabled={busy || !editor.historyState.undo}
          onClick={editor.undo}
        >
          {t("undo")}
        </Button>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconArrowForwardUp size={14} />}
          disabled={busy || !editor.historyState.redo}
          onClick={editor.redo}
        >
          {t("redo")}
        </Button>
        <Button size="xs" variant="subtle" disabled={busy || !editor.dirty} onClick={editor.reset}>
          {t("reset")}
        </Button>
        <Tooltip label={t("historyDescription")} multiline maw={360}>
          <ActionIcon variant="subtle" color="gray" aria-label={t("historyInfo")}>
            <IconInfoCircle size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <SegmentedControl
        className={classes.switcher}
        value={pane}
        onChange={setPane}
        data={[
          { value: "edit", label: t("code") },
          { value: "preview", label: t("previewPane") },
        ]}
      />
      <PackageSplit
        userId={userId}
        pane={pane}
        preview={<PackagePreview state={workspace} />}
      >
        <Stack className={classes.authoring}>
          <Tabs value={tab} onChange={selectTab}>
            <Tabs.List>
              <Tabs.Tab value="source">{t("code")}</Tabs.Tab>
              <Tabs.Tab value="connections">{t("connections")}</Tabs.Tab>
              <Tabs.Tab value="options">{t("options")}</Tabs.Tab>
              <Tabs.Tab value="installation">{t("installation")}</Tabs.Tab>
              <Tabs.Tab value="workshop">{t("workshopTab")}</Tabs.Tab>
            </Tabs.List>
            {visitedTabs.has("source") && (
              <PackageSourceEditor state={workspace} existing={Boolean(workspace.installationId)} />
            )}
            <Tabs.Panel value="connections" pt="md">
              {visitedTabs.has("connections") && (
                <PackageConnections
                  requirements={parsed.success ? parsed.data.connections : {}}
                  bindings={bindings}
                  onChange={setBindings}
                  onPendingChange={workspace.connectionPreparationChanged}
                  onSave={saveLocalBindings}
                  saving={busy}
                  onConnectionSaved={workspace.connectionChanged}
                />
              )}
            </Tabs.Panel>
            <Tabs.Panel value="options" pt="md">
              {visitedTabs.has("options") && (
                <Stack>
                  <Text size="sm" c="dimmed">{t("optionsDescription")}</Text>
                  {parsed.success && <PackageOptionFields schema={parsed.data.options} value={effectiveOptions} onChange={setOptions} />}
                  {parsed.success && Object.keys(parsed.data.options).length === 0 && <Alert>{t("noOptions")}</Alert>}
                  <Button variant="subtle" onClick={() => setOptions({})}>{t("resetOptions")}</Button>
                </Stack>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="installation" pt="md">
              {visitedTabs.has("installation") && (
                <PackageOperations
                  installation={current}
                  initialBoardId={initialBoardId}
                  source={parsed.success ? parsed.data : undefined}
                  options={effectiveOptions}
                  dirty={editor.dirty}
                  trusted={trusted}
                  connectionsDirty={workspace.bindingsDirty || busy}
                  onTrustChange={workspace.setTrusted}
                  onSave={() => void saveDraft()}
                  saving={busy}
                  onError={setError}
                  onMessage={setMessage}
                />
              )}
            </Tabs.Panel>
            <Tabs.Panel value="workshop" pt="md">
              {visitedTabs.has("workshop") && (
                <Stack>
                  <Text size="sm" c="dimmed">{t("workshopDescription")}</Text>
                  {current ? (
                    <>
                      <PackageWorkshop id={current.id} dirty={editor.dirty || workspace.bindingsDirty || busy} />
                      <PackageTransfer
                        id={current.id}
                        name={current.name}
                        active={Boolean(current.activeArtifactId)}
                        dirty={editor.dirty || workspace.bindingsDirty || busy}
                        onError={setError}
                      />
                    </>
                  ) : <Button onClick={() => void saveDraft()} loading={busy}>{t("saveDraft")}</Button>}
                </Stack>
              )}
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </PackageSplit>
    </Stack>
  );
}

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A focusable window splitter is an interactive separator, not a thematic break. */




const defaultWidth = 60;
const clampWidth = (value: number, maximum = 75) => Math.min(maximum, Math.max(30, value));

/** The split is an editor preference; it never changes the widget's authored dimensions. */
function PackageSplit({
  userId,
  pane,
  preview,
  children,
}: PropsWithChildren<{ userId: string; pane: string; preview: ReactNode }>) {
  const t = useI18n("customWidget.package");
  const [width, setWidth] = useState(defaultWidth);
  const [availableWidth, setAvailableWidth] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const key = `homarr:widget-workspace:split:${userId}`;
  const latest = useRef(width);
  let maximum = 75;
  if (availableWidth >= 650) maximum = Math.min(75, ((availableWidth - 338) / availableWidth) * 100);
  const visibleWidth = clampWidth(width, maximum);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry?.contentRect.width ?? 0));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved && Number.isFinite(Number(saved))) {
        const next = clampWidth(Number(saved));
        latest.current = next;
        setWidth(next);
      }
    } catch {
      // Browser storage is optional for editor preferences.
    }
  }, [key]);
  const remember = (value: number) => {
    const next = clampWidth(value, maximum);
    latest.current = next;
    setWidth(next);
    try {
      localStorage.setItem(key, String(next));
    } catch {
      // Resizing remains available when browser storage is disabled.
    }
  };
  return (
    <div
      ref={container}
      className={classes.workspace}
      data-pane={pane}
      style={{ "--widget-editor-width": `${visibleWidth}%` } as CSSProperties}
    >
      {children}
      <div
        className={classes.divider}
        role="separator"
        tabIndex={0}
        aria-label={t("resizeEditor")}
        title={t("resizeEditorHint")}
        aria-orientation="vertical"
        aria-valuemin={30}
        aria-valuemax={Math.round(maximum)}
        aria-valuenow={Math.round(visibleWidth)}
        onDoubleClick={() => remember(defaultWidth)}
        onKeyDown={(event) => {
          let next = visibleWidth;
          if (event.key === "ArrowLeft") next -= 5;
          else if (event.key === "ArrowRight") next += 5;
          else if (event.key === "Home") next = 30;
          else if (event.key === "End") next = maximum;
          else return;
          event.preventDefault();
          remember(next);
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const bounds = container.current?.getBoundingClientRect();
          if (!bounds?.width) return;
          latest.current = clampWidth(((event.clientX - bounds.left) / bounds.width) * 100, maximum);
          setWidth(latest.current);
        }}
        onPointerUp={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          remember(latest.current);
        }}
      />
      {preview}
    </div>
  );
}
