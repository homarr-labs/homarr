"use client";

import { extractErrorMessage } from "@homarr/common";

import { useState, useRef } from "react";
import { Button, Checkbox, Group, Paper, Select, Stack, Text, Accordion, Badge, SimpleGrid } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { IconBuildingStore } from "@tabler/icons-react";
import { customWidgetArchiveSchema } from "@homarr/custom-widgets/package";
import { CodeEditor } from "~/components/custom-widgets/code-editor";
import type { CustomWidgetArtifact } from "@homarr/custom-widgets/package";

export function PackageWorkshop({ id, dirty }: { id: string; dirty: boolean }) {
  const t = useI18n("customWidget.package");
  return (
    <Paper withBorder p="md" radius="md">
      <Stack align="flex-start">
        <Text fw={600}>{t("publishWorkshop")}</Text>
        <Text size="sm" c="dimmed">
          {t("publishDescription")}
        </Text>
        {dirty && (
          <Text size="sm" c="orange">
            {t("saveBeforePublish")}
          </Text>
        )}
        <Button
          component={Link}
          href={`/manage/custom-widgets/publish/${id}?kind=package`}
          disabled={dirty}
          leftSection={<IconBuildingStore size={16} />}
        >
          {t("publishWorkshop")}
        </Button>
      </Stack>
    </Paper>
  );
}

export function PackageTransfer({
  id,
  active,
  dirty,
  onError,
}: {
  id: string;
  active: boolean;
  dirty: boolean;
  onError(error: string): void;
}) {
  const t = useI18n("customWidget.package");
  const input = useRef<HTMLInputElement>(null);
  const [replace, setReplace] = useState(false);
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
