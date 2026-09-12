"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Alert, Button, Group, NumberInput, Paper, Select, Skeleton, Stack, Text, Title } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

const TrustedWidgetPreview = dynamic(() => import("@homarr/widgets/custom-api/trusted-widget-preview"), { ssr: false });

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
