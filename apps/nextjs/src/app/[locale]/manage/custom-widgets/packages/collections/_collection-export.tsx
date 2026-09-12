"use client";

import { useState } from "react";
import { Accordion, Alert, Button, Group, MultiSelect, Stack, Text, TextInput } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { fetchApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { downloadPackage } from "../_package-document";

export function PackageCollectionExport({
  installations,
}: {
  installations: RouterOutputs["customWidget"]["package"]["list"];
}) {
  const t = useI18n("customWidget.package.collections");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const exportCollection = async () => {
    setBusy(true);
    setError("");
    try {
      const archive = await fetchApi.customWidget.package.exportCollection.query({
        manifest: { id, name, version },
        installationIds: selected,
      });
      downloadPackage(name, archive);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Accordion variant="contained">
      <Accordion.Item value="export">
        <Accordion.Control>{t("export")}</Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <Text size="sm" c="dimmed">
              {t("exportDescription")}
            </Text>
            <MultiSelect
              label={t("widgets")}
              searchable
              value={selected}
              onChange={setSelected}
              maxValues={32}
              data={installations
                .filter((entry) => entry.activeArtifactId)
                .map((entry) => ({ value: entry.id, label: entry.name }))}
            />
            <Group grow>
              <TextInput label={t("name")} value={name} onChange={(event) => setName(event.currentTarget.value)} />
              <TextInput
                label={t("identity")}
                description={t("identityDescription")}
                placeholder={t("identityPlaceholder")}
                value={id}
                onChange={(event) => setId(event.currentTarget.value)}
              />
              <TextInput
                label={t("version")}
                value={version}
                onChange={(event) => setVersion(event.currentTarget.value)}
              />
            </Group>
            {error && <Alert color="red">{error}</Alert>}
            <Button
              loading={busy}
              disabled={!selected.length || !name.trim() || !id.trim()}
              onClick={() => void exportCollection()}
            >
              {t("export")}
            </Button>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
