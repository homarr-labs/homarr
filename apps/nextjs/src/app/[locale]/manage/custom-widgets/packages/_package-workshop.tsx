"use client";

import { extractErrorMessage } from "@homarr/common";

import { useState, useRef } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Accordion,
  Badge,
  SimpleGrid,
} from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { useWorkshopSubmissionQuery } from "@homarr/workshop/backend";
import { WorkshopAccountButton, useWorkshopSession } from "~/components/workshop/workshop-session";
import { customWidgetArchiveSchema } from "@homarr/custom-widgets/package";
import { CodeEditor } from "~/components/custom-widgets/code-editor";
import type { CustomWidgetArtifact } from "@homarr/custom-widgets/package";

export function PackageWorkshop({ id, dirty }: { id: string; dirty: boolean }) {
  const t = useI18n("customWidget.package");
  const session = useWorkshopSession();
  const update = clientApi.customWidget.package.checkUpdate.useQuery({ id });
  const stage = clientApi.customWidget.package.stageWorkshopUpdate.useMutation();
  const publish = clientApi.customWidget.package.publishWorkshop.useMutation();
  const [replace, setReplace] = useState(false);
  const [mode, setMode] = useState<"new" | "update" | "fork">("new");
  const [changelog, setChangelog] = useState("");
  const [forkedFrom, setForkedFrom] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const updateData = update.data;
  const linked = updateData?.origin !== undefined;
  let submissionId = "";
  if (linked) submissionId = updateData.origin.submissionId;
  const submission = useWorkshopSubmissionQuery(session.client, submissionId);
  return (
    <Paper withBorder p="md">
      <Stack>
        <Text fw={600}>{t("workshopLifecycle")}</Text>
        {update.error && <Alert color="yellow">{update.error.message}</Alert>}
        <Button variant="subtle" onClick={() => void update.refetch()}>
          {t("checkUpdates")}
        </Button>
        {linked && (
          <>
            <Text size="sm">{t("upstreamRelease", { version: updateData.origin.version })}</Text>
            {updateData.hasLocalChanges && <Alert color="yellow">{t("localChanges")}</Alert>}
            {updateData.available && updateData.latest && (
              <Stack gap="xs">
                <Text fw={500}>{t("updateAvailable", { version: updateData.latest.version })}</Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {updateData.latest.changelog}
                </Text>
                <Checkbox
                  checked={replace}
                  onChange={(event) => setReplace(event.currentTarget.checked)}
                  label={t("replaceDraft")}
                />
                <Button
                  disabled={!replace || dirty}
                  loading={stage.isPending}
                  onClick={() => {
                    if (!updateData.latest) return;
                    stage.mutate(
                      {
                        id,
                        releaseId: updateData.latest.id,
                        replaceLocalDraft: true,
                        expectedDraftDigest: updateData.draftDigest,
                      },
                      { onSuccess: (result) => window.location.assign(result.managementPath) },
                    );
                  }}
                >
                  {t("stageWorkshopUpdate")}
                </Button>
              </Stack>
            )}
          </>
        )}
        <Group justify="space-between">
          <Text fw={600}>{t("publishWorkshop")}</Text>
          <WorkshopAccountButton session={session} />
        </Group>
        <Select
          label={t("publishMode")}
          value={mode}
          onChange={(value) => {
            if (value === "new" || value === "update" || value === "fork") setMode(value);
          }}
          data={[
            { value: "new", label: t("publishNew") },
            { value: "update", label: t("publishUpdate") },
            { value: "fork", label: t("publishFork") },
          ]}
        />
        {mode === "fork" && (
          <TextInput
            label={t("forkedFrom")}
            value={forkedFrom}
            onChange={(event) => setForkedFrom(event.currentTarget.value)}
          />
        )}
        <Textarea
          label={t("changelog")}
          value={changelog}
          onChange={(event) => setChangelog(event.currentTarget.value)}
          autosize
          minRows={3}
        />
        <Checkbox
          checked={reviewed}
          onChange={(event) => setReviewed(event.currentTarget.checked)}
          label={t("publishAcknowledgement")}
        />
        <Button
          disabled={!session.user || dirty || !reviewed || (mode === "update" && !submission.data)}
          loading={publish.isPending}
          onClick={() => {
            const token = session.client.authToken;
            if (!token) return;
            publish.mutate(
              {
                id,
                token,
                mode,
                submissionId: submissionId || undefined,
                expectedRevision: submission.data?.revision,
                forkedFrom: forkedFrom || undefined,
                changelog,
              },
              {
                onSuccess: () => {
                  setReviewed(false);
                  void update.refetch();
                },
              },
            );
          }}
        >
          {t("publishWorkshop")}
        </Button>
        {publish.data && (
          <Alert color="green">
            <Text>{t("published", { version: publish.data.version })}</Text>
            <Button
              component="a"
              href={publish.data.workshopUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
            >
              {t("openWorkshop")}
            </Button>
          </Alert>
        )}
        {stage.error && <Alert color="red">{stage.error.message}</Alert>}
        {publish.error && <Alert color="red">{publish.error.message}</Alert>}
      </Stack>
    </Paper>
  );
}

export function PackageTransfer({
  id,
  name,
  active,
  dirty,
  onError,
}: {
  id: string;
  name: string;
  active: boolean;
  dirty: boolean;
  onError(error: string): void;
}) {
  const t = useI18n("customWidget.package");
  const input = useRef<HTMLInputElement>(null);
  const [replace, setReplace] = useState(false);
  const [forkName, setForkName] = useState(`${name} fork`);
  const fork = clientApi.customWidget.package.fork.useMutation();
  const update = clientApi.customWidget.package.stageUpdate.useMutation();
  const changes = clientApi.customWidget.package.draftChanges.useQuery({ id });
  const stage = async (file: File) => {
    try {
      if (file.size > 25_000_000) throw new Error(t("importTooLarge"));
      const raw: unknown = JSON.parse(await file.text());
      const archive = customWidgetArchiveSchema.parse(raw);
      const result = await update.mutateAsync({ id, archive, replaceLocalDraft: true });
      window.location.assign(result.managementPath);
    } catch (error) {
      onError(extractErrorMessage(error));
    }
  };
  return (
    <Stack>
      <Accordion>
        <Accordion.Item value="changes">
          <Accordion.Control>{t("changes")}</Accordion.Control>
          <Accordion.Panel>
            <Stack>
              <Text size="sm" c="dimmed">
                {t("sourceOnly")}
              </Text>
              {changes.data?.valid && (
                <>
                  <Text size="sm">
                    {changes.data.fromVersion ?? t("none")} → {changes.data.toVersion}
                  </Text>
                  <Group>
                    {changes.data.dependenciesChanged && <Badge color="yellow">{t("dependenciesChanged")}</Badge>}
                    {changes.data.connectionsChanged && <Badge color="yellow">{t("connectionsChanged")}</Badge>}
                    {changes.data.configurationChanged && <Badge color="yellow">{t("configurationChanged")}</Badge>}
                  </Group>
                  {changes.data.files.map((file) => (
                    <Stack key={file.name} gap="xs">
                      <Text fw={500}>{file.name}</Text>
                      <SimpleGrid cols={{ base: 1, lg: 2 }}>
                        <CodeEditor
                          id={`before-${file.name}`}
                          label={t("before")}
                          value={file.before ?? ""}
                          language="tsx"
                          readOnly
                          onChange={() => undefined}
                        />
                        <CodeEditor
                          id={`after-${file.name}`}
                          label={t("after")}
                          value={file.after ?? ""}
                          language="tsx"
                          readOnly
                          onChange={() => undefined}
                        />
                      </SimpleGrid>
                    </Stack>
                  ))}
                </>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      {active && (
        <Paper withBorder p="md">
          <Stack>
            <Checkbox
              checked={replace}
              onChange={(event) => setReplace(event.currentTarget.checked)}
              label={t("replaceDraft")}
            />
            <input
              hidden
              type="file"
              ref={input}
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void stage(file);
              }}
            />
            <Button
              variant="default"
              disabled={!replace || dirty}
              loading={update.isPending}
              onClick={() => input.current?.click()}
            >
              {t("stageUpdate")}
            </Button>
          </Stack>
        </Paper>
      )}
      <Paper withBorder p="md">
        <Stack>
          <Text size="sm">{t("forkDescription")}</Text>
          <TextInput
            label={t("forkName")}
            value={forkName}
            onChange={(event) => setForkName(event.currentTarget.value)}
          />
          <Button
            variant="default"
            disabled={dirty || !forkName.trim()}
            loading={fork.isPending}
            onClick={() =>
              fork.mutate(
                { id, name: forkName },
                {
                  onSuccess: (result) => window.location.assign(result.managementPath),
                  onError: (error) => onError(error.message),
                },
              )
            }
          >
            {t("fork")}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

export function PackageArtifactReview({ artifact }: { artifact: CustomWidgetArtifact }) {
  const t = useI18n("customWidget.package.artifactReview");
  const [selected, setSelected] = useState("dependency-lock.json");
  const files: Record<string, string> = { "dependency-lock.json": JSON.stringify(artifact.dependencyLock, null, 2) };
  for (const [surface, compiled] of Object.entries(artifact.client)) {
    if (!compiled) continue;
    files[`${surface}.js`] = compiled.javascript;
    if (compiled.css) files[`${surface}.css`] = compiled.css;
  }
  if (artifact.server) files["server.js"] = artifact.server;
  const path = Object.hasOwn(files, selected) ? selected : "dependency-lock.json";
  return (
    <Accordion>
      <Accordion.Item value="artifact">
        <Accordion.Control>{t("title")}</Accordion.Control>
        <Accordion.Panel>
          <Stack gap="xs">
            <Text size="sm">{t("description")}</Text>
            <Text size="xs" ff="monospace" style={{ overflowWrap: "anywhere" }}>
              {artifact.digest}
            </Text>
            <Select
              label={t("file")}
              value={path}
              data={Object.keys(files)}
              onChange={(value) => {
                if (value) setSelected(value);
              }}
            />
            <CodeEditor
              id={`artifact-${artifact.digest}-${path}`}
              label={path}
              value={files[path] ?? ""}
              language={path.endsWith(".json") ? "json" : path.endsWith(".css") ? "css" : "tsx"}
              readOnly
              height="320px"
              onChange={() => undefined}
            />
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
