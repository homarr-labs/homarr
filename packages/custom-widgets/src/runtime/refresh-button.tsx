"use client";

import { useState } from "react";
import { ActionIcon } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import { useCustomWidgetRuntime } from "./context";

export interface RefreshButtonProps {
  label?: string;
  color?: string;
  variant?: string;
  size?: string;
}

export function RefreshButton({ label, color = "gray", variant = "subtle", size = "sm" }: RefreshButtonProps) {
  const runtime = useCustomWidgetRuntime();
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    if (!runtime.itemId && !runtime.previewSessionId) return;
    setLoading(true);
    try {
      await runtime.port.invalidate({
        itemId: runtime.itemId,
        previewSessionId: runtime.previewSessionId,
        targets: ["parent", "*"],
        refresh: true,
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <ActionIcon
      aria-label={label ?? runtime.messages.refresh}
      color={color}
      variant={variant as never}
      size={size as never}
      onClick={() => void refresh()}
      loading={loading}
      disabled={(!runtime.itemId && !runtime.previewSessionId) || !runtime.canInvalidateQueries || runtime.isEditMode}
    >
      <IconRefresh size={16} />
    </ActionIcon>
  );
}
