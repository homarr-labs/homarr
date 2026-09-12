"use client";

import { Alert, Button, Divider, Group, Popover, Stack, Text, Textarea } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { useOptionalHomarrAssistant } from "~/components/assistant/assistant-context";
import { createId } from "@homarr/common";
import { widgetReferencePackages } from "@homarr/widget-sdk/examples";
import { packageDraftToolContracts } from "~/components/assistant/assistant-package-draft-contracts";
import type {
  PackageDraftReview,
  ProposePackageChangesArgs,
} from "~/components/assistant/assistant-package-draft-contracts";
import {
  notifyPackageDraftChanged,
  registerAssistantPackageDraft,
} from "~/components/assistant/assistant-package-draft-registry";
import { packageAssistantSdkContext } from "@homarr/custom-widgets/authoring-prompt";
import { recoveryDocument } from "@homarr/custom-widgets/workbench/package";
import type { PackageDocument } from "@homarr/custom-widgets/workbench/package";
import type { usePackageWorkspace } from "./_use-package-workspace";

export function PackageAssistant() {
  const t = useI18n("customWidget.package.assistant");
  const assistant = useOptionalHomarrAssistant();
  const [request, setRequest] = useState("");
  const [opened, setOpened] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const send = (intent: string) => {
    if (!assistant?.enabled || assistant.isRunning) return;
    setSendFailed(false);
    assistant.open();
    if (
      assistant.sendPrompt(
        `${intent}\nWork on the currently visible trusted widget package v3 draft. First call read_widget_package_draft, then propose_widget_package_changes against its exact revision. Read relevant source examples through that tool when helpful. Keep credentials in local connections. Propose reviewable changes; do not save, activate, install or claim preview success.`,
      )
    ) {
      setOpened(false);
      setRequest("");
    } else setSendFailed(true);
  };
  return (
    <Popover opened={opened} onChange={setOpened} width={320} withinPortal position="bottom-start">
      <Popover.Target>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconSparkles size={14} />}
          onClick={() => setOpened((value) => !value)}
          aria-expanded={opened}
        >
          {t("open")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        {!assistant?.enabled && (
          <Stack gap="sm">
            <Text size="sm">{assistant?.unavailableDescription || t("unavailable")}</Text>
            <Button component={Link} href="/manage/assistant" variant="light" size="xs">
              {t("setup")}
            </Button>
            <Text size="xs" c="dimmed">
              {t("manual")}
            </Text>
          </Stack>
        )}
        {assistant?.enabled && (
          <>
            {assistant.isRunning && <Alert mb="xs">{t("busy")}</Alert>}
            {sendFailed && (
              <Alert color="yellow" mb="xs">
                {t("sendFailed")}
              </Alert>
            )}
            <Text size="xs" c="dimmed" mb="xs">
              {t("context")}
            </Text>
            <Textarea
              mx="xs"
              mb="xs"
              label={t("request")}
              placeholder={t("requestPlaceholder")}
              value={request}
              onChange={(event) => setRequest(event.currentTarget.value)}
              minRows={3}
            />
            <Group px="xs" pb="xs">
              <Button size="xs" disabled={!request.trim() || assistant.isRunning} onClick={() => send(request)}>
                {t("send")}
              </Button>
            </Group>
            <Divider my="xs" />
            <Stack gap={4}>
              <Button
                variant="subtle"
                size="xs"
                justify="start"
                disabled={assistant.isRunning}
                onClick={() => send(t("createPrompt"))}
              >
                {t("create")}
              </Button>
              <Button
                variant="subtle"
                size="xs"
                justify="start"
                disabled={assistant.isRunning}
                onClick={() => send(t("improvePrompt"))}
              >
                {t("improve")}
              </Button>
              <Button
                variant="subtle"
                size="xs"
                justify="start"
                disabled={assistant.isRunning}
                onClick={() => send(t("advancedPrompt"))}
              >
                {t("advanced")}
              </Button>
              <Button
                variant="subtle"
                size="xs"
                justify="start"
                disabled={assistant.isRunning}
                onClick={() => send(t("fixPrompt"))}
              >
                {t("fix")}
              </Button>
            </Stack>
          </>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}

type Workspace = ReturnType<typeof usePackageWorkspace>;
const maximumContextCharacters = 180_000;

export function usePackageAssistant(workspace: Workspace) {
  const identity = useRef({ document: workspace.document, revision: createId() });
  if (identity.current.document !== workspace.document)
    identity.current = { document: workspace.document, revision: createId() };
  const revision = identity.current.revision;
  const latest = useRef({ workspace, revision });
  latest.current = { workspace, revision };
  const readState = useRef({ revision: "", paths: new Set<string>(), metadata: false });

  useEffect(
    () =>
      registerAssistantPackageDraft({
        read(input) {
          const { workspace: state, revision: currentRevision } = latest.current;
          const sanitized = recoveryDocument(state.document);
          if (readState.current.revision !== currentRevision)
            readState.current = { revision: currentRevision, paths: new Set(), metadata: false };
          const metadataOmitted = sanitized.metadata.length > 60_000;
          if (!metadataOmitted) readState.current.metadata = true;
          const files: Record<string, string> = {};
          const omittedFiles: string[] = [];
          let remaining = maximumContextCharacters;
          for (const path of input.paths ?? Object.keys(sanitized.files)) {
            const value = sanitized.files[path];
            if (value === undefined || value.length > remaining) {
              omittedFiles.push(path);
              continue;
            }
            files[path] = value;
            remaining -= value.length;
            readState.current.paths.add(path);
          }
          const redactedFiles = Object.keys(sanitized.files).filter(
            (path) => sanitized.files[path] !== state.document.files[path],
          );
          let previewEvidence: unknown = { status: "not-previewed-current-candidate" };
          if (state.preview && !state.stale)
            previewEvidence = {
              status: "compiled-and-preview-session-created",
              revision: currentRevision,
              artifactDigest: state.preview.displayData.artifactDigest,
              browserRenderingVerified: false,
              liveActions: state.preview.liveActions,
            };
          return {
            installationId: state.installationId,
            saved: !state.editor.dirty,
            revision: currentRevision,
            name: sanitized.name,
            metadata: metadataOmitted ? undefined : sanitized.metadata,
            metadataOmitted,
            selectedFile: state.selected,
            filePaths: Object.keys(sanitized.files),
            files,
            omittedFiles,
            oversizedFiles: Object.entries(sanitized.files)
              .filter(([, value]) => value.length > maximumContextCharacters)
              .map(([path]) => path),
            contextLimits: {
              fileCharacters: maximumContextCharacters,
              metadataCharacters: 60_000,
              oversizedFilesRequireManualEdit: true,
            },
            redactedFiles,
            metadataRedacted: sanitized.metadata !== state.document.metadata,
            diagnostics: recoveryDocument({ name: "", metadata: state.error, files: {} }).metadata.slice(0, 4000),
            schemaValid: state.parsed.success,
            validationIssues: state.parsed.success
              ? []
              : state.parsed.error.issues.map(({ path, message }) => ({ path, message })),
            sdk: packageAssistantSdkContext,
            reference: input.reference ? widgetReferencePackages[input.reference] : undefined,
            previewEvidence,
            excluded: [
              "local connection bindings",
              "connection settings and credentials",
              "preview option values",
              "runtime response data",
            ],
          };
        },
        review(input) {
          return prepare(input, latest.current, readState.current).review;
        },
        apply(input) {
          const prepared = prepare(input, latest.current, readState.current);
          if (!prepared.review.available || !prepared.next) return { applied: false, error: prepared.review.error };
          latest.current.workspace.resetExecution();
          readState.current = { revision: "", paths: new Set(), metadata: false };
          latest.current.workspace.edit(prepared.next);
          return { applied: true };
        },
      }),
    [],
  );
  useEffect(() => {
    notifyPackageDraftChanged();
  }, [revision, workspace.busy, workspace.preview, workspace.error]);
}

function prepare(
  input: ProposePackageChangesArgs,
  { workspace, revision }: { workspace: Workspace; revision: string },
  read: { revision: string; paths: Set<string>; metadata: boolean },
): { review: PackageDraftReview; next?: PackageDocument } {
  const parsed = packageDraftToolContracts.propose_widget_package_changes.parameters.safeParse(input);
  if (!parsed.success) return unavailable("The proposed patch is invalid.");
  if (revision !== input.revision || read.revision !== revision)
    return unavailable("The draft changed. Ask the Assistant to read the current draft and propose again.");
  if (workspace.busy) return unavailable("Wait for the current save or preview to finish.");
  const current = workspace.document;
  if (input.metadata !== undefined && !read.metadata)
    return unavailable(
      "The manifest is too large for Assistant context. Edit it directly before proposing a replacement.",
    );
  const sanitized = recoveryDocument(current);
  if (input.metadata !== undefined && sanitized.metadata !== current.metadata)
    return unavailable(
      "The manifest contains redacted credentials. Move them to a local connection before replacing this file.",
    );
  if (input.name !== undefined && sanitized.name !== current.name)
    return unavailable("The name contains redacted credentials. Edit it directly before proposing a replacement.");
  const next = {
    name: input.name ?? current.name,
    metadata: input.metadata ?? current.metadata,
    files: { ...current.files },
  };
  const changes: PackageDraftReview["changes"] = [];
  if (next.name !== current.name) changes.push({ path: "Installation name", before: current.name, after: next.name });
  if (next.metadata !== current.metadata)
    changes.push({ path: "widget.json", before: current.metadata, after: next.metadata });
  for (const [path, value] of Object.entries(input.files)) {
    if (Object.hasOwn(current.files, path) && !read.paths.has(path))
      return unavailable(`Read '${path}' before proposing changes to it.`);
    if (sanitized.files[path] !== current.files[path])
      return unavailable(
        `'${path}' contains redacted credentials. Move them to local connections before replacing this file.`,
      );
    if (value === null) delete next.files[path];
    else next.files[path] = value;
    if (value !== current.files[path]) changes.push({ path, before: current.files[path] ?? "", after: value ?? "" });
  }
  if (
    Object.keys(next.files).length > 256 ||
    Object.values(next.files).reduce((size, file) => size + file.length, 0) > 20_000_000
  )
    return unavailable("The proposed draft exceeds package size limits.");
  return { next, review: { available: true, changes } };
}

const unavailable = (error: string) => ({ review: { available: false, error, changes: [] } });
