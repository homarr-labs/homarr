"use client";

import dynamic from "next/dynamic";
import { Accordion, Alert, Button, Checkbox, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { IconCode, IconPlayerPlay } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { PackagePreviewViewport } from "./_package-preview-viewport";
import { PackagePreviewControls } from "./_package-preview-controls";
import { downloadPackage } from "./_package-document";
import type { usePackageWorkspace } from "./_use-package-workspace";
import classes from "./_package-workspace.module.css";

const TrustedWidgetPreview = dynamic(() => import("@homarr/widgets/custom-api/trusted-widget-preview"), { ssr: false });

export function PackagePreview({
  state,
  existing,
}: {
  state: ReturnType<typeof usePackageWorkspace>;
  existing: boolean;
}) {
  const t = useI18n("customWidget.package");
  const {
    parsed,
    trusted,
    setTrusted,
    liveActions,
    setLiveActions,
    busy,
    previewMutation,
    save,
    runPreview,
    document,
    source,
    surfaceChoices,
    surface,
    setSurface,
    width,
    height,
    scale,
    previewTheme,
    scenario,
    setScenario,
    stale,
    preview,
    previewReady,
    previewLoadError,
    setOptions,
  } = state;
  return (
    <Stack className={classes.preview} gap="sm">
      <Group gap="xs" wrap="nowrap">
        <Select
          flex={1}
          aria-label={t("surface")}
          data={surfaceChoices}
          value={surface}
          onChange={(value) => {
            if (value === "tile" || value === "advanced" || value === "configuration") setSurface(value);
          }}
        />
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          loading={previewMutation.isPending}
          disabled={!existing || !parsed.success || !trusted || save.isPending}
          onClick={() => void runPreview()}
        >
          {t("preview")}
        </Button>
      </Group>
      <Checkbox
        size="xs"
        checked={trusted}
        disabled={!parsed.success || busy}
        onChange={(event) => setTrusted(event.currentTarget.checked)}
        label={t("trustShort")}
      />
      {parsed.success && Object.keys(parsed.data.previewScenarios ?? {}).length > 0 && (
        <Select
          label={t("previewScenario")}
          value={scenario ?? ""}
          disabled={busy}
          onChange={(value) => setScenario(value || null)}
          data={[
            { value: "", label: t("previewConnected") },
            ...Object.entries(parsed.data.previewScenarios ?? {}).map(([id, fixture]) => ({
              value: id,
              label: fixture.label,
            })),
          ]}
        />
      )}
      <Checkbox
        size="xs"
        checked={liveActions}
        disabled={!parsed.success || busy || Boolean(scenario)}
        onChange={(event) => setLiveActions(event.currentTarget.checked)}
        label={t("previewLiveActions")}
      />
      {!existing && (
        <Text size="xs" c="dimmed">
          {t("saveFirst")}
        </Text>
      )}
      {stale && (
        <Alert color="yellow" p="xs">
          {t("previewStale")}
        </Alert>
      )}
      <Paper withBorder className={classes.canvas} p="xs">
        {preview && (
          <PackagePreviewViewport width={width} height={height} scale={scale} colorScheme={previewTheme}>
            <TrustedWidgetPreview
              data={preview.displayData}
              width={width}
              height={height}
              displayScale={scale}
              surface={surface}
              onOptionsChange={setOptions}
              onSurfaceChange={setSurface}
              frozen={stale || previewMutation.isPending}
              onReady={previewReady}
              onLoadError={previewLoadError}
            />
          </PackagePreviewViewport>
        )}
        {!preview && (
          <Stack justify="center" align="center" mih={220} p="sm">
            <IconCode size={32} stroke={1} />
            <Text c="dimmed" size="sm" ta="center">
              {t("previewEmpty")}
            </Text>
          </Stack>
        )}
      </Paper>
      <Group gap="xs" align="center">
        {preview && (
          <Text size="xs" c="dimmed">
            {t(preview.liveActions ? "previewLiveSession" : "previewSimulatedSession")}
          </Text>
        )}
        {preview?.displayData.previewScenario && (
          <Text size="xs" c="dimmed">
            {t("previewSynthetic", { name: preview.displayData.previewScenario.label })}
          </Text>
        )}
      </Group>
      <PackagePreviewControls state={state} />
      <Accordion variant="default">
        <Accordion.Item value="trust">
          <Accordion.Control>{t("executionDetails")}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text size="sm">{t("trustedCode")}</Text>
              <Text size="xs" c="dimmed">
                {t("previewDescription")}
              </Text>
              <Text size="xs">
                {t("dependencies")}:{" "}
                {(parsed.success &&
                  Object.entries(parsed.data.dependencies)
                    .map(([name, version]) => `${name}@${version}`)
                    .join(", ")) ||
                  t("hostOnly")}
              </Text>
              <Button variant="default" size="xs" onClick={() => downloadPackage(document.name, source)}>
                {t("exportDraft")}
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
