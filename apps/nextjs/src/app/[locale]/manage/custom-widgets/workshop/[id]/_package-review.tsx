"use client";

import { useCallback, useState } from "react";
import { Accordion, Alert, Button, Paper, Select, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "~/components/custom-widgets/code-editor";
import { PackageConnections } from "../../packages/_package-connections";
import { PackageArtifactReview } from "../../packages/_package-artifact-review";

export function WorkshopPackageReview({ submissionId }: { submissionId: string }) {
  const t = useI18n("customWidget.package");
  const releases = clientApi.customWidget.package.workshopReleases.useQuery({ submissionId });
  const [selected, setSelected] = useState<string | null>(null);
  const releaseId = selected ?? releases.data?.[0]?.id ?? "";
  const release = clientApi.customWidget.package.workshopRelease.useQuery(
    { releaseId },
    { enabled: Boolean(releaseId) },
  );
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [pendingConnections, setPendingConnections] = useState(0);
  const connectionPreparationChanged = useCallback((pending: boolean) => {
    setPendingConnections((current) => {
      if (pending) return current + 1;
      return current - 1;
    });
  }, []);
  const install = clientApi.customWidget.package.installWorkshop.useMutation();
  const busy = install.isPending || pendingConnections > 0;
  return (
    <Paper withBorder p="md">
      <Stack>
        <Text fw={600}>{t("releaseReview")}</Text>
        <Text size="sm">{t("sourceOnly")}</Text>
        <Select
          label={t("release")}
          data={(releases.data ?? []).map((entry) => ({
            value: entry.id,
            label: `${entry.version} · ${entry.created}`,
          }))}
          value={releaseId || null}
          disabled={busy}
          onChange={(value) => {
            setSelected(value);
            setBindings({});
          }}
        />
        {releases.error && <Alert color="red">{releases.error.message}</Alert>}
        {release.error && <Alert color="red">{release.error.message}</Alert>}
        {release.data && (
          <>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {release.data.release.changelog}
            </Text>
            <Text size="sm">
              {t("dependencies")}:{" "}
              {Object.entries(release.data.source.dependencies)
                .map(([name, version]) => `${name}@${version}`)
                .join(", ") || t("hostOnly")}
            </Text>
            <Text size="xs" ff="monospace">
              {release.data.origin.sourceDigest}
            </Text>
            <Accordion>
              {Object.entries(release.data.source.files).map(([path, content]) => (
                <Accordion.Item key={path} value={path}>
                  <Accordion.Control>{path}</Accordion.Control>
                  <Accordion.Panel>
                    <CodeEditor
                      id={`workshop-${path}`}
                      label={path}
                      language={path.endsWith(".css") ? "css" : "tsx"}
                      value={content}
                      readOnly
                      onChange={() => undefined}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
            {release.data.artifact && <PackageArtifactReview artifact={release.data.artifact} />}
            <PackageConnections
              requirements={release.data.source.connections}
              bindings={bindings}
              onChange={setBindings}
              onPendingChange={connectionPreparationChanged}
              saving={busy}
            />
            <Text size="sm" c="dimmed">
              {t("installDisabled")}
            </Text>
            <Button
              loading={install.isPending}
              disabled={busy}
              onClick={() =>
                install.mutate(
                  { releaseId, bindings },
                  { onSuccess: (result) => window.location.assign(result.managementPath) },
                )
              }
            >
              {t("installReview")}
            </Button>
          </>
        )}
        {install.error && <Alert color="red">{install.error.message}</Alert>}
      </Stack>
    </Paper>
  );
}
