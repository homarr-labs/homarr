"use client";

import { useEffect } from "react";

import type { WidgetKind } from "@homarr/definitions";

import { useWidgetActivitySignal } from "./use-widget-activity-signal";

interface Props {
  boardId: string | undefined;
  itemId: string;
  kind: WidgetKind;
  options: Record<string, unknown>;
  integrationIds: string[];
  onActiveChange: (active: boolean) => void;
}

export const AutoExpandWatcher = ({ boardId, itemId, kind, options, integrationIds, onActiveChange }: Props) => {
  const isActive = useWidgetActivitySignal({ boardId, itemId, kind, options, integrationIds });

  useEffect(() => {
    onActiveChange(isActive === true);
  }, [isActive, onActiveChange]);

  return null;
};
