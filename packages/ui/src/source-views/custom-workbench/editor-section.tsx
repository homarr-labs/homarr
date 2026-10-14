"use client";

import { Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";

import type { EditorSectionProps } from "./contracts";
import classes from "./custom-widget-form.module.css";

export function EditorSection({ id, title, icon: SectionIcon, children }: EditorSectionProps) {
  return (
    <Card id={id} component="section" withBorder p="lg" className={classes.editorSection}>
      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon variant="light" size="lg">
            <SectionIcon size={18} />
          </ThemeIcon>
          <Text fw={700} size="lg">
            {title}
          </Text>
        </Group>
        {children}
      </Stack>
    </Card>
  );
}
