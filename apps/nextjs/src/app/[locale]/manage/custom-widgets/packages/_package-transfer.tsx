"use client";

import { useRef, useState } from "react";
import { Accordion, Badge, Button, Checkbox, Group, Paper, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { customWidgetArchiveSchema } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "~/components/custom-widgets/code-editor";

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
      onError(error instanceof Error ? error.message : String(error));
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
