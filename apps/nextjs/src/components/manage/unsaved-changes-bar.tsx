"use client";

import type { CSSProperties, ReactNode } from "react";
import type { MantineTransition } from "@mantine/core";
import { Card, Group, Text, Transition } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface UnsavedChangesBarProps {
  children: ReactNode;
  /** Omit to keep the bar mounted without an enter or exit animation. */
  visible?: boolean;
  transition?: MantineTransition;
}

export const UnsavedChangesBar = ({ children, visible, transition = "slide-up" }: UnsavedChangesBarProps) => {
  const t = useI18n();

  const renderCard = (style?: CSSProperties) => (
    <Card bg="var(--mantine-color-body)" style={style}>
      <Group justify="space-between" wrap="wrap">
        <Text fw={500}>{t("common.unsavedChanges")}</Text>
        <Group>{children}</Group>
      </Group>
    </Card>
  );

  let content: ReactNode;
  if (visible === undefined) {
    content = renderCard();
  } else {
    content = (
      <Transition mounted={visible} transition={transition}>
        {renderCard}
      </Transition>
    );
  }

  return <div style={{ position: "sticky", bottom: 20, zIndex: "var(--mantine-z-index-app)" }}>{content}</div>;
};
