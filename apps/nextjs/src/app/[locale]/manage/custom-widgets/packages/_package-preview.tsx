"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Accordion, Alert, Badge, Button, Checkbox, Group, Select, Stack, Text } from "@mantine/core";
import { IconCode, IconPlayerPlay } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { WidgetPreviewFrame } from "@homarr/widgets/preview";

import { PackagePreviewViewport } from "./_package-preview-viewport";
import { PackagePreviewControls } from "./_package-preview-controls";
import { PackageRuntimeStatus } from "./_package-runtime-status";
import { downloadPackage } from "./_package-document";
import type { usePackageWorkspace } from "./_use-package-workspace";
import classes from "./_package-workspace.module.css";

const TrustedWidgetPreview = dynamic(() => import("@homarr/widgets/custom-api/trusted-widget-preview"), { ssr: false });

export function PackagePreview({ state }: { state: ReturnType<typeof usePackageWorkspace> }) {
  const t = useI18n("customWidget.package");
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null);
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
  let buildStatus = t("previewNotBuilt");
  if (previewMutation.isPending) buildStatus = t("previewBuilding");
  if (previewMutation.isError) buildStatus = t("previewBuildFailed");
  if (previewMutation.isSuccess) buildStatus = t("previewBuildReady");
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
          loading={previewMutation.isPending || save.isPending}
          disabled={!parsed.success || !trusted || busy}
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
      {!state.installationId && (
        <Text size="xs" c="dimmed">
          {t("previewSavesFirst")}
        </Text>
      )}
      {stale && (
        <Alert color="yellow" p="xs">
          {t("previewStale")}
        </Alert>
      )}
      <WidgetPreviewFrame
        dimensions={{ width, height, scale }}
        resize={{ size: state.gridSize, maximumSize: { width: 12, height: 12 }, onChange: state.setGridSize }}
      >
        {({ scale: fittedScale }) => (
          <>
            {preview && (
              <PackagePreviewViewport width={width} height={height} scale={fittedScale} colorScheme={previewTheme}>
                <TrustedWidgetPreview
                  data={preview.displayData}
                  width={width}
                  height={height}
                  displayScale={fittedScale}
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
          </>
        )}
      </WidgetPreviewFrame>
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
      <Accordion variant="default" value={detailsOpen} onChange={setDetailsOpen}>
        <Accordion.Item value="trust">
          <Accordion.Control>{t("executionDetails")}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Badge variant="light">{buildStatus}</Badge>
              {previewMutation.error && <Alert color="red">{previewMutation.error.message}</Alert>}
              <Text size="sm">{t("browserExecution")}</Text>
              <Text size="sm">{parsed.success && parsed.data.manifest.entrypoints.server ? t("serverExecution") : t("browserOnlyExecution")}</Text>
              <Text size="sm">{t("trustedCode")}</Text>
              <Text size="sm">{t("runtimeLogs")}</Text>
              {detailsOpen && state.installationId && <PackageRuntimeStatus id={state.installationId} />}
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
