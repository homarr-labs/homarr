import type { ReactNode } from "react";
import { VisuallyHidden } from "@mantine/core";

import classes from "./component.module.css";
import { getStatusColor } from "./coolify-utils";

export type CoolifyTone = "positive" | "negative" | "warning" | "neutral";

const toneByColor: Record<string, CoolifyTone> = {
  green: "positive",
  red: "negative",
  yellow: "warning",
};

export const getStatusTone = (status: string): CoolifyTone => toneByColor[getStatusColor(status)] ?? "neutral";

export const StatusDot = ({ tone }: { tone: CoolifyTone }) => (
  <span className={classes.dot} data-tone={tone} aria-hidden="true" />
);

interface StatusPillProps {
  tone: CoolifyTone;
  label: string;
  /** Shorter visible content for narrow tiles; the full label stays available to assistive technology. */
  children?: ReactNode;
  size?: "md" | "lg";
}

export const StatusPill = ({ tone, label, children, size = "md" }: StatusPillProps) => (
  <span className={classes.pill} data-size={size} title={label}>
    <StatusDot tone={tone} />
    {children === undefined ? (
      label
    ) : (
      <>
        <VisuallyHidden>{label}</VisuallyHidden>
        <span aria-hidden="true">{children}</span>
      </>
    )}
  </span>
);
