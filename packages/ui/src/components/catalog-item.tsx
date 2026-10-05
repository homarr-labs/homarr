import type { KeyboardEvent, ReactNode } from "react";
import { Card } from "@mantine/core";

import classes from "./catalog-item.module.css";

interface CatalogItemProps {
  label: string;
  status?: string;
  selected?: boolean;
  disabled?: boolean;
  busy?: boolean;
  height?: number;
  onSelect: () => void;
  onFocus?: () => void;
  onPointerEnter?: () => void;
  onMoveFocus?: (direction: "next" | "previous" | "first" | "last") => void;
  children: ReactNode;
}

export const CatalogItem = ({
  label,
  status,
  selected,
  disabled = false,
  busy = false,
  height,
  onSelect,
  onFocus,
  onPointerEnter,
  onMoveFocus,
  children,
}: CatalogItemProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction = getCatalogKeyboardDirection(event.key);
    if (!direction) return;
    event.preventDefault();
    if (onMoveFocus) onMoveFocus(direction);
    else moveCatalogFocus(event.currentTarget, direction);
  };

  return (
    <Card
      component="button"
      type="button"
      className={classes.root}
      h={height}
      withBorder
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-label={status ? `${label}, ${status}` : label}
      aria-pressed={selected}
      data-catalog-item
      data-selected={selected || undefined}
      onClick={onSelect}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Card>
  );
};

export const moveCatalogFocus = (current: HTMLButtonElement, direction: "next" | "previous" | "first" | "last") => {
  const items = Array.from(
    current.parentElement?.querySelectorAll<HTMLButtonElement>("button[data-catalog-item]:not(:disabled)") ?? [],
  );
  if (items.length === 0) return;

  const currentIndex = items.indexOf(current);
  const targetIndex =
    direction === "first"
      ? 0
      : direction === "last"
        ? items.length - 1
        : direction === "next"
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
  items[targetIndex]?.focus();
};

export const getCatalogKeyboardDirection = (key: string) => {
  if (key === "ArrowRight" || key === "ArrowDown") return "next" as const;
  if (key === "ArrowLeft" || key === "ArrowUp") return "previous" as const;
  if (key === "Home") return "first" as const;
  if (key === "End") return "last" as const;
  return null;
};
