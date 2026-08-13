import type { ReactNode } from "react";
import { Anchor, Group, Stack, Text, VisuallyHidden } from "@mantine/core";

import type { HermesTypographyScale, LayoutMode } from "./layout";
import { HERMES_CHROME_TEXT_STYLE, HERMES_TECHNICAL_TEXT_STYLE, useHermesTheme } from "./theme";

export interface MetricDefinition {
  id: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  title?: string;
  detail?: string;
  color?: string;
  href?: string;
}

interface MetricTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  title?: string;
  detail?: string;
  color?: string;
  href?: string;
  mode: LayoutMode;
  hideDetail: boolean;
  typography: HermesTypographyScale;
  tallExpanded: boolean;
}

export function MetricTile({
  icon,
  label,
  value,
  title,
  detail,
  color,
  href,
  mode,
  hideDetail,
  typography,
  tallExpanded,
}: MetricTileProps) {
  const theme = useHermesTheme();
  const valueTitle = `${label}: ${title ?? value}${detail && !hideDetail ? ` ${detail}` : ""}`;
  const isChip = mode === "standard" && hideDetail;
  const isDense = mode !== "showcase";

  if (mode === "micro" || mode === "mini") {
    const tile = (
      <Stack
        h="100%"
        gap={0}
        align={mode === "micro" ? "center" : "stretch"}
        justify="center"
        p={2}
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius,
          overflow: "hidden",
        }}
      >
        {mode === "micro" ? (
          <Text
            fz={typography.metricLabel}
            lh={1.1}
            c={theme.textSecondary}
            lineClamp={1}
            title={valueTitle}
            style={{ ...HERMES_CHROME_TEXT_STYLE, letterSpacing: "0.02em", minWidth: 0 }}
          >
            {label}
          </Text>
        ) : (
          <Text
            fz={typography.metricLabel}
            lh={1.1}
            c={theme.textPrimary}
            lineClamp={1}
            title={valueTitle}
            style={{ ...HERMES_CHROME_TEXT_STYLE, letterSpacing: "0.02em", minWidth: 0 }}
          >
            {label}
          </Text>
        )}
        <MetricValue value={value} title={valueTitle} color={color} fontSize={typography.metricValue} />
      </Stack>
    );

    if (!href) return tile;

    return (
      <Anchor
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        h="100%"
        title={valueTitle}
        aria-label={valueTitle}
        underline="never"
        style={{ display: "block", minWidth: 0 }}
      >
        {tile}
      </Anchor>
    );
  }

  if (mode === "tall") {
    const labelElement = (
      <Text
        fz={typography.metricLabel}
        lh={tallExpanded ? 1.1 : 1}
        c={theme.textSecondary}
        lineClamp={1}
        title={valueTitle}
        style={{ ...HERMES_CHROME_TEXT_STYLE, letterSpacing: "0.02em", minWidth: 0 }}
      >
        {label}
      </Text>
    );
    const valueElement = (
      <MetricValue value={value} title={valueTitle} color={color} fontSize={typography.metricValue} />
    );
    const tileStyle = {
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: theme.radius,
      overflow: "hidden",
    } as const;
    const tile = (
      <Stack
        h="100%"
        gap={tallExpanded ? 1 : 0}
        justify="center"
        px={tallExpanded ? 4 : 3}
        py={tallExpanded ? 2 : 0}
        style={tileStyle}
      >
        {labelElement}
        {valueElement}
      </Stack>
    );

    if (!href) return tile;

    return (
      <Anchor
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        h="100%"
        title={valueTitle}
        aria-label={valueTitle}
        underline="never"
        style={{ display: "block", minWidth: 0 }}
      >
        {tile}
      </Anchor>
    );
  }

  if (mode === "strip") {
    const tile = (
      <Stack
        h="100%"
        gap={0}
        justify="center"
        px={4}
        py={2}
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius,
          overflow: "hidden",
        }}
      >
        <Text
          fz={typography.metricLabel}
          lh={1.1}
          c={theme.textSecondary}
          lineClamp={1}
          title={valueTitle}
          style={{ ...HERMES_CHROME_TEXT_STYLE, letterSpacing: "0.04em", minWidth: 0 }}
        >
          {label}
        </Text>
        <Group gap={3} wrap="nowrap" miw={0}>
          <MetricValue value={value} title={valueTitle} color={color} fontSize={typography.metricValue} />
          {detail && !hideDetail && (
            <Text fz={typography.metricDetail} c={theme.textTertiary} lineClamp={1} title={detail}>
              {detail}
            </Text>
          )}
        </Group>
      </Stack>
    );

    if (!href) return tile;

    return (
      <Anchor
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        h="100%"
        title={valueTitle}
        aria-label={valueTitle}
        underline="never"
        style={{ display: "block", minWidth: 0 }}
      >
        {tile}
      </Anchor>
    );
  }

  if (isChip) {
    return (
      <Group
        gap={1}
        wrap="nowrap"
        p={1}
        miw={0}
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius,
          overflow: "hidden",
        }}
      >
        <Text c={theme.textTertiary} lh={1} style={{ display: "flex", flexShrink: 0 }}>
          {icon}
        </Text>
        <MetricValue
          href={href}
          value={value}
          title={valueTitle}
          accessibleLabel={label}
          color={color}
          fontSize={typography.metricValue}
        />
      </Group>
    );
  }

  return (
    <Stack
      gap={0}
      p={isDense ? 3 : 5}
      style={{
        border: `1px solid ${theme.border}`,
        background: theme.surface,
        borderRadius: theme.radius,
        overflow: "hidden",
      }}
    >
      <Group gap={isDense ? 2 : 4} wrap="nowrap" miw={0}>
        <Text c={theme.textTertiary} lh={1} style={{ display: "flex", flexShrink: 0 }}>
          {icon}
        </Text>
        <Text
          fz={typography.metricLabel}
          c={theme.textPrimary}
          lineClamp={1}
          title={valueTitle}
          style={{ ...HERMES_CHROME_TEXT_STYLE, letterSpacing: "0.04em", minWidth: 0 }}
        >
          {label}
        </Text>
      </Group>
      <Group gap={isDense ? 2 : 4} wrap="nowrap" miw={0}>
        <MetricValue href={href} value={value} title={valueTitle} color={color} fontSize={typography.metricValue} />
        {detail && !hideDetail && (
          <Text fz={typography.metricDetail} c={theme.textTertiary} lineClamp={1} title={detail}>
            {detail}
          </Text>
        )}
      </Group>
    </Stack>
  );
}

interface MetricValueProps {
  href?: string;
  value: string | number;
  title: string;
  accessibleLabel?: string;
  color?: string;
  fontSize: number;
}

function MetricValue({ href, value, title, accessibleLabel, color, fontSize }: MetricValueProps) {
  if (!href) {
    return (
      <Text
        fz={fontSize}
        fw={700}
        c={color ?? "inherit"}
        lh={1.15}
        lineClamp={1}
        title={title}
        style={HERMES_TECHNICAL_TEXT_STYLE}
      >
        {accessibleLabel && <VisuallyHidden>{accessibleLabel}: </VisuallyHidden>}
        {value}
      </Text>
    );
  }

  return (
    <Anchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      fz={fontSize}
      fw={700}
      c={color ?? "inherit"}
      lh={1.15}
      underline="never"
      lineClamp={1}
      title={title}
      style={HERMES_TECHNICAL_TEXT_STYLE}
    >
      {accessibleLabel && <VisuallyHidden>{accessibleLabel}: </VisuallyHidden>}
      {value}
    </Anchor>
  );
}
