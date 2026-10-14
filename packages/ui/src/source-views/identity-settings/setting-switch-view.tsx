"use client";

import { useCallback } from "react";
import { Group, Stack, Switch, Text, UnstyledButton } from "@mantine/core";

import type { SettingSwitchViewProps } from "./contracts";

export const SettingSwitchView = ({ checked, ms, title, text, disabled, onToggle }: SettingSwitchViewProps) => {
  const handleClick = useCallback(() => {
    if (disabled) {
      return;
    }

    onToggle();
  }, [onToggle, disabled]);

  return (
    <Group ms={ms} justify="space-between" gap="lg" align="center" wrap="nowrap">
      <UnstyledButton style={{ flexGrow: 1 }} onClick={handleClick}>
        <Stack gap={0}>
          <Text fw="bold">{title}</Text>
          <Text c="gray.5" fz={{ base: "xs", md: "sm" }}>
            {text}
          </Text>
        </Stack>
      </UnstyledButton>
      <Switch disabled={disabled} onClick={handleClick} checked={checked} />
    </Group>
  );
};
