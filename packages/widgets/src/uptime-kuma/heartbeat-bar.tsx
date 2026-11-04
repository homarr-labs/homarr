"use client";

import type { PointerEvent } from "react";
import { useState } from "react";
import { Tooltip, VisuallyHidden } from "@mantine/core";
import { useFormatter } from "next-intl";

import type { UptimeKumaHeartbeat } from "@homarr/integrations/types";
import { uptimeKumaMaxHeartbeats } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import classes from "./component.module.css";

interface HeartbeatBarProps {
  heartbeats: readonly UptimeKumaHeartbeat[];
  size?: "sm" | "md";
}

export const HeartbeatBar = ({ heartbeats, size = "md" }: HeartbeatBarProps) => {
  const t = useI18n("widget.uptimeKuma");
  const formatter = useFormatter();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hovered = hoveredIndex === null ? undefined : heartbeats[hoveredIndex];
  const placeholderCount = Math.max(0, uptimeKumaMaxHeartbeats - heartbeats.length);
  const downCount = heartbeats.filter((heartbeat) => heartbeat.status === "down").length;

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const index = event.target instanceof HTMLElement ? event.target.dataset.index : undefined;
    setHoveredIndex(index === undefined ? null : Number(index));
  };

  return (
    <Tooltip.Floating
      disabled={!hovered}
      label={
        hovered &&
        [
          t(`status.${hovered.status}`),
          formatter.dateTime(hovered.time, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          hovered.ping === null ? null : t("unit.milliseconds", { value: Math.round(hovered.ping) }),
        ]
          .filter(Boolean)
          .join(" · ")
      }
    >
      <div
        className={classes.heartbeatBar}
        data-size={size}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredIndex(null)}
      >
        <VisuallyHidden>{t("heartbeatBar.label", { count: heartbeats.length, down: downCount })}</VisuallyHidden>
        <span className={classes.beats} aria-hidden>
          {Array.from({ length: placeholderCount }, (_, index) => (
            <span key={`placeholder-${index}`} className={classes.beat} data-status="empty" />
          ))}
          {heartbeats.map((heartbeat, index) => (
            <span key={index} className={classes.beat} data-status={heartbeat.status} data-index={index} />
          ))}
        </span>
      </div>
    </Tooltip.Floating>
  );
};
