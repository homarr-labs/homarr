"use client";

import type { ReactNode } from "react";
import { Group, Image, Text } from "@mantine/core";

import { getIconUrl } from "@homarr/definitions";

// Dashboard Icons' default logo has a near-black outline for light backgrounds; the "-dark" variant
// swaps it for white, for dark themes.
const darkIconUrl = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/thingport-dark.svg";
const LOGO_SIZE = 20;

// Below these the header would crowd out the widget's own content, as WUD's title hides on a tiny widget.
const MIN_WIDTH = 160;
const MIN_HEIGHT = 120;

export const canShowThingportHeader = (width: number, height: number) => width >= MIN_WIDTH && height >= MIN_HEIGHT;

interface ThingportWidgetHeaderProps {
  title: ReactNode;
  rightSection?: ReactNode;
}

/** The optional title row shared by the Thingport widgets: the Thingport logo and a dimmed title. */
export function ThingportWidgetHeader({ title, rightSection }: ThingportWidgetHeaderProps) {
  return (
    <Group gap="xs" wrap="nowrap" justify="space-between" miw={0} style={{ flexShrink: 0 }}>
      <Group gap="xs" wrap="nowrap" miw={0}>
        {/* Both are rendered and CSS hides one, so the right logo shows from the first paint with no flash. */}
        <Image src={getIconUrl("thingport")} alt="" aria-hidden w={LOGO_SIZE} h={LOGO_SIZE} fit="contain" darkHidden />
        <Image src={darkIconUrl} alt="" aria-hidden w={LOGO_SIZE} h={LOGO_SIZE} fit="contain" lightHidden />
        <Text size="sm" c="dimmed" lineClamp={1}>
          {title}
        </Text>
      </Group>
      {rightSection}
    </Group>
  );
}
