"use client";

import { useMemo } from "react";
import { Badge, Button, Center, Code, Paper, ScrollArea, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";
import { createDisplayComponents } from "@homarr/widgets/custom-api/component";

interface PreviewWidgetPanelProps {
  data: Record<string, unknown> | null;
  displayType: string;
  success: boolean;
  responseInfo: { status: number; statusText: string } | null;
  previewSize: string;
  onPreviewSizeChange: (value: string) => void;
}

const HEIGHTS: Record<string, number> = { compact: 240, standard: 360, wide: 520 };

export function PreviewWidgetPanel({
  data,
  displayType,
  success,
  responseInfo,
  previewSize,
  onPreviewSizeChange,
}: PreviewWidgetPanelProps) {
  const t = useScopedI18n("customWidget");
  const height = HEIGHTS[previewSize] ?? HEIGHTS.standard;
  return (
    <Stack gap="xs">
      <SegmentedControl
        size="xs"
        fullWidth
        value={previewSize}
        onChange={onPreviewSizeChange}
        data={(["compact", "standard", "wide"] as const).map((value) => ({
          value,
          label: t(`preview.size.${value}` as never),
        }))}
      />
      {data && (displayType === "actionButton" || success) ? (
        <>
          {success && (
            <Badge
              size="xs"
              color={responseInfo ? "green" : "gray"}
              variant="light"
              style={{ alignSelf: "flex-start" }}
            >
              {responseInfo ? `${responseInfo.status} ${responseInfo.statusText}` : t("preview.response.localSample")}
            </Badge>
          )}
          <Paper withBorder p="xs" h={height} style={{ overflow: "auto" }}>
            <PreviewDisplay data={data} />
          </Paper>
        </>
      ) : (
        <Center h={height}>
          <Stack gap={4} align="center" maw={280}>
            <IconPlayerPlay size={22} color="var(--mantine-color-dimmed)" />
            <Text size="sm" fw={500} ta="center">
              {t("preview.empty.title")}
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              {t("preview.hint")}
            </Text>
          </Stack>
        </Center>
      )}
    </Stack>
  );
}

function PreviewDisplay({ data }: { data: Record<string, unknown> }) {
  const t = useScopedI18n("customWidget");
  const widgetT = useScopedI18n("widget.customApi");
  const displayComponents = useMemo(() => createDisplayComponents(widgetT("openJson")), [widgetT]);
  const dataType = data.type as string | undefined;
  if (dataType === "actionButton") {
    return (
      <Center p="sm" h="100%">
        <Button type="button" size="sm" color={(data.buttonColor as string) ?? "blue"} disabled>
          {(data.buttonLabel as string) ?? t("preview.execute")}
        </Button>
      </Center>
    );
  }
  const Component = dataType ? displayComponents[dataType] : undefined;
  if (Component) return <Component data={data} />;
  return (
    <ScrollArea h="100%">
      <Code block style={{ fontSize: 11 }}>
        {JSON.stringify(data, null, 2)}
      </Code>
    </ScrollArea>
  );
}
