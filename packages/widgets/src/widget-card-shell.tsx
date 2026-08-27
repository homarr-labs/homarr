"use client";

import type { AriaRole, CSSProperties, PropsWithChildren, Ref } from "react";
import type { CardProps } from "@mantine/core";
import { Badge, Card } from "@mantine/core";
import combineClasses from "clsx";

import type { WidgetKind } from "@homarr/definitions";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

import classes from "./widget-card-shell.module.css";

const getOverflow = (kind: WidgetKind, hasCustomCssClasses: boolean): CSSProperties => {
  if (kind === "iframe" || kind === "assistant") return { overflowX: "hidden", overflowY: "hidden" };
  if (hasCustomCssClasses) return {};
  return { overflowX: "hidden", overflowY: "auto" };
};

interface WidgetCardShellProps extends PropsWithChildren<Omit<CardProps, "className" | "styles">> {
  kind: WidgetKind;
  advancedOptions: BoardItemAdvancedOptions;
  opacity: number;
  className?: string;
  innerRef?: Ref<HTMLDivElement>;
  id?: string;
  role?: AriaRole;
  "aria-label"?: string;
  "data-advanced-focus-surface"?: boolean;
  "data-grid-item-content"?: boolean;
}

export const WidgetCardShell = ({
  kind,
  advancedOptions,
  opacity,
  className,
  innerRef,
  children,
  ...cardProps
}: WidgetCardShellProps) => (
  <Card
    {...cardProps}
    ref={innerRef}
    className={combineClasses(
      classes.card,
      kind === "iframe" && classes.iframe,
      `${kind}-wrapper`,
      "board-grid-item-content",
      advancedOptions.customCssClasses.join(" "),
      className,
    )}
    styles={{
      root: {
        "--opacity": opacity,
        "--border-color": advancedOptions.borderColor || undefined,
        containerType: "size",
        ...getOverflow(kind, advancedOptions.customCssClasses.length > 0),
      } as CSSProperties,
    }}
  >
    {children}
  </Card>
);

interface WidgetTitleBadgeProps {
  advancedOptions: BoardItemAdvancedOptions;
  opacity: number;
  radius: CardProps["radius"];
}

export const WidgetTitleBadge = ({ advancedOptions, opacity, radius }: WidgetTitleBadgeProps) => {
  if (!advancedOptions.title?.trim()) return null;

  return (
    <Badge
      pos="absolute"
      style={{ zIndex: "var(--mantine-z-index-app)" }}
      top={2}
      left={16}
      size="xs"
      radius={radius}
      styles={{
        root: {
          "--border-color": advancedOptions.borderColor || undefined,
          "--opacity": opacity,
        } as CSSProperties,
      }}
      className={classes.title}
      c="var(--mantine-color-text)"
    >
      {advancedOptions.title}
    </Badge>
  );
};
