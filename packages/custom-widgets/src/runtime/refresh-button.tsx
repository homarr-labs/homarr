"use client";

import { useState } from "react";
import { ActionIcon } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import { useCustomWidgetRuntime } from "./context";

export interface RefreshButtonProps {
  requestId?: string;
  label?: string;
  color?: string;
  variant?: string;
  size?: string;
}

export function RefreshButton({
  requestId,
  label,
  color = "gray",
  variant = "subtle",
  size = "sm",
}: RefreshButtonProps) {
  const runtime = useCustomWidgetRuntime();
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    if (!runtime.itemId && !runtime.previewSessionId) return;
    setLoading(true);
    try {
      let targets = ["parent", "*"];
      if (requestId) targets = [requestId];
      await runtime.port.invalidate({
        itemId: runtime.itemId,
        previewSessionId: runtime.previewSessionId,
        targets,
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
      disabled={(!runtime.itemId && !runtime.previewSessionId) || runtime.isEditMode}
    >
      <IconRefresh size={16} />
    </ActionIcon>
  );
}
