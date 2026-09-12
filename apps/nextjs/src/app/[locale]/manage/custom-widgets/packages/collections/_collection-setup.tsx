"use client";

import { useState } from "react";
import { Accordion, Alert, Badge, Button, Checkbox, Group, Paper, Select, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { PackageOptionFields } from "@homarr/widgets/custom-api/package-option-fields";

import { PackageConnections } from "../_package-connections";
import { useCollectionPlacement } from "./_use-collection-placement";
import type { CollectionConfiguration, WidgetCollection } from "./_use-collection-placement";

export function PackageCollectionSetup({ initialData }: { initialData: WidgetCollection }) {
  const t = useI18n("customWidget.package");
  const query = clientApi.customWidget.package.collection.useQuery({ importId: initialData.importId }, { initialData });
  const collection = query.data;
  const boards = clientApi.board.getAllBoards.useQuery();
  const saveBindings = clientApi.customWidget.package.setCollectionBindings.useMutation();
  const [bindings, setBindings] = useState(initialData.bindings);
  const [configuration, setConfiguration] = useState<CollectionConfiguration>({});
  const [selected, setSelected] = useState(initialData.entries.map((entry) => entry.id));
  const [boardId, setBoardId] = useState<string | null>(null);
  const [reviewedKey, setReviewedKey] = useState<string | null>(null);
  const reviewKey = JSON.stringify([
    collection.entries.filter((entry) => selected.includes(entry.id)).map((entry) => [entry.id, entry.draftDigest]),
    bindings,
  ]);
  const trusted = reviewedKey === reviewKey;
  const setTrusted = (value: boolean) => {
    setReviewedKey(value ? reviewKey : null);
  };
  const [error, setError] = useState("");
  const progress = useCollectionPlacement(collection);
  const busy = progress.busy || saveBindings.isPending;
  const board = boards.data?.find((candidate) => candidate.id === boardId);
  const requiredSlots = new Set(
    collection.entries
      .filter((entry) => selected.includes(entry.id))
      .flatMap((entry) =>
        Object.entries(entry.requirements)
          .filter(([, requirement]) => !requirement.optional)
          .map(([name]) => entry.mapping[name]),
      ),
  );
  const missing = Object.entries(collection.connections).filter(([name]) => requiredSlots.has(name) && !bindings[name]);
  const save = () => {
    setError("");
    saveBindings.mutate(
      { importId: collection.importId, bindings },
      {
        onSuccess: () => void query.refetch(),
        onError: (cause) => setError(cause.message),
      },
    );
  };
  return (
    <Stack>
      <Group>
        <Badge variant="light">{collection.manifest.version}</Badge>
        {collection.manifest.author && (
          <Text size="sm" c="dimmed">
            {collection.manifest.author}
          </Text>
        )}
        {collection.manifest.license && (
          <Text size="sm" c="dimmed">
            {collection.manifest.license}
          </Text>
        )}
      </Group>
      <Text c="dimmed">{collection.manifest.description ?? t("collections.description")}</Text>
      <Text size="sm">{t("collections.setupDescription")}</Text>
      {(error || progress.error) && <Alert color="red">{error || progress.error}</Alert>}
      {collection.bindingConflicts.length > 0 && (
        <Alert color="yellow">
          {t("collections.bindingConflicts", { names: collection.bindingConflicts.join(", ") })}
        </Alert>
      )}
      {Object.keys(collection.connections).length > 0 && (
        <Paper withBorder p="md">
          <Stack>
            <Text fw={600}>{t("connections")}</Text>
            <PackageConnections
              requirements={collection.connections}
              bindings={bindings}
              onChange={setBindings}
              onSave={save}
              saving={busy}
              onConnectionSaved={() => setTrusted(false)}
            />
          </Stack>
        </Paper>
      )}
      <Paper withBorder p="md">
        <Stack>
          <Text fw={600}>{t("collections.widgets")}</Text>
          <Text size="sm" c="dimmed">
            {t("collections.optionsDescription")}
          </Text>
          {collection.entries.map((entry) => (
            <Stack key={entry.id} gap="xs">
              <Group justify="space-between">
                <Checkbox
                  checked={selected.includes(entry.id)}
                  disabled={busy || !entry.manifest}
                  label={entry.name}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setSelected((current) =>
                      checked ? [...current, entry.id] : current.filter((id) => id !== entry.id),
                    );
                  }}
                />
                <Button
                  component={Link}
                  href={entry.managementPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  size="compact-xs"
                >
                  {t("collections.review")}
                </Button>
              </Group>
              {!entry.manifest && <Alert color="red">{t("collections.needsRepair", { name: entry.name })}</Alert>}
              {progress.status[entry.id] && (
                <Text size="sm" c={progress.status[entry.id]?.failed ? "red" : "dimmed"}>
                  {progress.status[entry.id]?.text}
                </Text>
              )}
              {Object.keys(entry.optionDefinitions).length > 0 && (
                <Accordion variant="default">
                  <Accordion.Item value="options">
                    <Accordion.Control>{t("options")}</Accordion.Control>
                    <Accordion.Panel>
                      <div inert={busy}>
                        <PackageOptionFields
                          schema={entry.optionDefinitions}
                          value={configuration[entry.id] ?? entry.configuration}
                          onChange={(value) => setConfiguration((current) => ({ ...current, [entry.id]: value }))}
                        />
                      </div>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              )}
            </Stack>
          ))}
        </Stack>
      </Paper>
      <Paper withBorder p="md">
        <Stack>
          <Select
            searchable
            label={t("board")}
            value={boardId}
            onChange={setBoardId}
            disabled={busy}
            data={(boards.data ?? []).map((candidate) => ({ value: candidate.id, label: candidate.name }))}
          />
          {missing.length > 0 && (
            <Alert color="yellow">
              {t("bindFirst", { names: missing.map(([, requirement]) => requirement.label).join(", ") })}
            </Alert>
          )}
          <Checkbox
            checked={trusted}
            disabled={busy}
            onChange={(event) => setTrusted(event.currentTarget.checked)}
            label={t("collections.trust")}
          />
          <Text size="xs" c="dimmed">
            {t("collections.activationDescription")}
          </Text>
          <Group>
            <Button
              loading={progress.busy}
              disabled={!board || !trusted || !selected.length || missing.length > 0 || saveBindings.isPending}
              onClick={() => {
                if (board) void progress.run(board, selected, bindings, configuration);
              }}
            >
              {t("collections.activateAndAdd")}
            </Button>
            {progress.busy && (
              <Button variant="default" disabled={progress.stopping} onClick={progress.stop}>
                {t("collections.stop")}
              </Button>
            )}
            {progress.completedBoard && (
              <Button component={Link} href={"/boards/" + encodeURIComponent(progress.completedBoard)} variant="light">
                {t("openBoard")}
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
