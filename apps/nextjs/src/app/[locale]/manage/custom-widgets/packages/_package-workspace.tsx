"use client";
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
} from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp, IconInfoCircle } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { PackagePreview } from "./_package-preview";
import { PackageSplit } from "./_package-split";
import { PackageAssistant } from "./_package-assistant";
import { usePackageAssistant } from "./_use-package-assistant";
import { PackageSourceEditor } from "./_package-source-editor";
import { PackageConnections } from "./_package-connections";
import { PackageOperations } from "./_package-operations";
import { usePackageWorkspace } from "./_use-package-workspace";
import type { Installation } from "./_use-package-workspace";
import classes from "./_package-workspace.module.css";
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
    previewMutation,
    saveBindings,
    busy,
    saveDraft,
    saveLocalBindings,
  } = workspace;
  usePackageAssistant(workspace);

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
          <Badge variant="light">{editor.dirty ? t("unsaved") : t("saved")}</Badge>
          <Button
            loading={save.isPending}
            disabled={!document.name.trim() || previewMutation.isPending}
            onClick={() => void saveDraft()}
          >
            {t("saveDraft")}
          </Button>
        </Group>
      </Group>
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
        preview={<PackagePreview state={workspace} existing={Boolean(installation)} />}
      >
        <Stack className={classes.authoring}>
          <Tabs defaultValue="source">
            <Tabs.List>
              <Tabs.Tab value="source">{t("code")}</Tabs.Tab>
              <Tabs.Tab value="connections">{t("connections")}</Tabs.Tab>
              <Tabs.Tab value="installation">{t("installation")}</Tabs.Tab>
            </Tabs.List>
            <PackageSourceEditor state={workspace} existing={Boolean(installation)} />
            <Tabs.Panel value="connections" pt="md">
              <PackageConnections
                requirements={parsed.success ? parsed.data.connections : {}}
                bindings={bindings}
                onChange={setBindings}
                onSave={saveLocalBindings}
                saving={saveBindings.isPending}
                onConnectionSaved={workspace.connectionChanged}
              />
              {!installation && (
                <Text size="sm" c="dimmed">
                  {t("saveFirst")}
                </Text>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="installation" pt="md">
              <PackageOperations
                installation={installation}
                initialBoardId={initialBoardId}
                source={parsed.success ? parsed.data : undefined}
                options={effectiveOptions}
                setOptions={setOptions}
                dirty={editor.dirty}
                trusted={trusted}
                onError={setError}
                onMessage={setMessage}
              />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </PackageSplit>
    </Stack>
  );
}
