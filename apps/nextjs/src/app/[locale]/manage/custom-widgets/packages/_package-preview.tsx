"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Select,
  Stack,
  Text,
  NumberInput,
  Paper,
  Skeleton,
  Title,
} from "@mantine/core";
import { IconCode, IconPlayerPlay } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { WidgetPreviewFrame, WidgetPreviewViewport } from "@homarr/widgets/preview";
import { downloadPackage } from "@homarr/custom-widgets/workbench/package";
import type { usePackageWorkspace } from "./_use-package-workspace";
import classes from "./_package-workspace.module.css";
import { clientApi } from "@homarr/api/client";
import { Link } from "@homarr/ui";

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
              <WidgetPreviewViewport width={width} height={height} scale={fittedScale} colorScheme={previewTheme}>
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
              </WidgetPreviewViewport>
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

function PackagePreviewControls({ state }: { state: ReturnType<typeof usePackageWorkspace> }) {
  const t = useI18n("customWidget.package");
  const { width, height, scale, previewTheme, setWidth, setHeight, setScale, setPreviewTheme } = state;
  return (
    <Stack gap="xs">
      <Group gap="xs" grow>
        <Select
          size="xs"
          label={t("previewTheme")}
          value={previewTheme}
          data={[
            { value: "system", label: t("previewThemeCurrent") },
            { value: "light", label: t("previewThemeLight") },
            { value: "dark", label: t("previewThemeDark") },
          ]}
          onChange={(value) => {
            if (value === "system" || value === "light" || value === "dark") setPreviewTheme(value);
          }}
        />
      </Group>
      <Accordion>
        <Accordion.Item value="dimensions">
          <Accordion.Control>{t("customViewport")}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text size="xs" c="dimmed">{t("customViewportDescription")}</Text>
              <Group gap="xs" grow>
                <NumberInput
                  size="xs"
                  label={t("width")}
                  min={100}
                  max={2400}
                  value={width}
                  onChange={(value) => {
                    if (typeof value === "number") setWidth(value);
                  }}
                />
                <NumberInput
                  size="xs"
                  label={t("height")}
                  min={100}
                  max={1600}
                  value={height}
                  onChange={(value) => {
                    if (typeof value === "number") setHeight(value);
                  }}
                />
                <NumberInput
                  size="xs"
                  label={t("previewScale")}
                  min={25}
                  max={90}
                  suffix="%"
                  step={10}
                  value={Math.round(scale * 100)}
                  onChange={(value) => {
                    if (typeof value === "number") setScale(Math.min(0.9, Math.max(0.25, value / 100)));
                  }}
                />
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

function PackageRuntimeStatus({ id }: { id: string }) {
  const t = useI18n("customWidget.package.runtime");
  const status = clientApi.customWidget.package.runtimeStatus.useQuery({ id });
  const data = status.data;
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>{t("title")}</Text>
      <Text size="xs" c="dimmed">{t("description")}</Text>
      <Group>
        {data && <Badge variant="light">{t(data.state)}</Badge>}
        <Button variant="subtle" size="xs" loading={status.isFetching} onClick={() => void status.refetch()}>{t("refresh")}</Button>
      </Group>
      {data && "pid" in data && (
        <Text size="xs">{t("process", { pid: data.pid ?? "—", active: data.activeRequests, queued: data.queuedRequests })}</Text>
      )}
      {data && "error" in data && <Alert color="red">{data.error}</Alert>}
      {status.error && <Alert color="red">{status.error.message}</Alert>}
      <Button component={Link} href="/manage/tools/logs" target="_blank" rel="noopener noreferrer" variant="default" size="xs">{t("logs")}</Button>
    </Stack>
  );
}


export function PackageSessionPreview({ previewId }: { previewId: string }) {
  const t = useI18n("customWidget.package");
  const { data, error, isLoading } = clientApi.customWidget.package.previewGet.useQuery(
    { previewId },
    { retry: false },
  );
  const [surface, setSurface] = useState<"tile" | "advanced" | "configuration">("tile");
  const [width, setWidth] = useState(480);
  const [height, setHeight] = useState(360);
  if (isLoading) return <Skeleton height={360} />;
  if (error || !data)
    return (
      <Alert color="yellow" title={t("sessionUnavailable")}>
        {t("sessionUnavailableDescription")}
      </Alert>
    );
  const choices = [{ value: "tile", label: t("tile") }];
  if (data.displayData.manifest.entrypoints.advanced) choices.push({ value: "advanced", label: t("advanced") });
  if (data.displayData.manifest.entrypoints.configuration)
    choices.push({ value: "configuration", label: t("configuration") });
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{data.displayData.manifest.name}</Title>
        <Button
          component={Link}
          href={`/manage/custom-widgets/packages/${data.displayData.installationId}`}
          variant="subtle"
        >
          {t("openWorkspace")}
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        {t("sessionDescription")}
      </Text>
      {data.displayData.previewScenario && (
        <Text size="sm" c="dimmed">
          {t("previewSynthetic", { name: data.displayData.previewScenario.label })}
        </Text>
      )}
      <Group align="end">
        <Select
          label={t("surface")}
          data={choices}
          value={surface}
          onChange={(value) => {
            if (value === "tile" || value === "advanced" || value === "configuration") setSurface(value);
          }}
        />
        <NumberInput
          w={110}
          label={t("width")}
          min={100}
          max={2400}
          value={width}
          onChange={(value) => {
            if (typeof value === "number") setWidth(value);
          }}
        />
        <NumberInput
          w={110}
          label={t("height")}
          min={100}
          max={2400}
          value={height}
          onChange={(value) => {
            if (typeof value === "number") setHeight(value);
          }}
        />
      </Group>
      <Paper withBorder p="sm" style={{ overflow: "auto" }}>
        <div style={{ width, height }}>
          <TrustedWidgetPreview
            data={data.displayData}
            width={width}
            height={height}
            surface={surface}
            onSurfaceChange={setSurface}
          />
        </div>
      </Paper>
    </Stack>
  );
}
