"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActionIcon, Group, Paper, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import type { AddInPlaceVariant } from "./variants/contract";

interface PrototypeSwitcherProps {
  variants: Record<string, AddInPlaceVariant>;
  activeKey: string;
}

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA";
};

export const PrototypeSwitcher = ({ variants, activeKey }: PrototypeSwitcherProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const keys = Object.keys(variants);
  const enabled = process.env.NODE_ENV !== "production";

  const cycle = useCallback(
    (direction: 1 | -1) => {
      const index = keys.indexOf(activeKey);
      const next = keys[(index + direction + keys.length) % keys.length];
      if (!next) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [activeKey, keys, pathname, router, searchParams],
  );

  useEffect(() => {
    if (!enabled) return;
    const handle = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft") cycle(-1);
      if (event.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [cycle, enabled]);

  if (!enabled) return null;

  return (
    <Paper
      withBorder
      shadow="md"
      radius="xl"
      px="xs"
      py={4}
      data-add-in-place-inside=""
      style={{ position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 300 }}
    >
      <Group gap="xs" wrap="nowrap">
        <ActionIcon variant="subtle" size="sm" onClick={() => cycle(-1)} aria-label="Previous variant">
          <IconChevronLeft size={16} />
        </ActionIcon>
        <Text size="xs" fw={600}>
          {variants[activeKey]?.name ?? activeKey}
        </Text>
        <ActionIcon variant="subtle" size="sm" onClick={() => cycle(1)} aria-label="Next variant">
          <IconChevronRight size={16} />
        </ActionIcon>
      </Group>
    </Paper>
  );
};
