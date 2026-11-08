"use client";

/* oxlint-disable react/iframe-missing-sandbox -- Trusted Homarr pages require same-origin scripts for authenticated previews and the theme bridge. */

import { useEffect, useRef, useState } from "react";
import { Alert, Box, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

import { useI18n } from "@homarr/translation/client";

import type { ThemePreviewMessage } from "./theme-preview-context";

export const ThemePreviewFrame = ({
  message,
  boardName,
  width,
}: {
  message: ThemePreviewMessage;
  boardName: string | null;
  width: string;
}) => {
  const t = useI18n("common.customTheme.studio");
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draft] = useDebouncedValue(message, 100);
  const latest = useRef(draft);
  latest.current = draft;
  let source = "/theme-preview?theme-preview=1";
  if (message.surface === "liveBoard" && boardName) source = `/boards/${encodeURIComponent(boardName)}?theme-preview=1`;

  useEffect(() => {
    setReady(false);
    setFailed(false);
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (data?.type === "homarr-theme-preview-ready")
        frame.current?.contentWindow?.postMessage(latest.current, window.location.origin);
      if (data?.type === "homarr-theme-preview-applied") {
        setReady(true);
        setFailed(false);
      }
    };
    window.addEventListener("message", receive);
    const timeout = window.setTimeout(() => setFailed(true), 30_000);
    return () => {
      window.removeEventListener("message", receive);
      window.clearTimeout(timeout);
    };
  }, [source]);

  useEffect(() => {
    frame.current?.contentWindow?.postMessage(draft, window.location.origin);
  }, [draft]);

  return (
    <Box>
      {!ready && (
        <Text component="output" size="sm" c="dimmed" mb="xs">
          {t("loadingPreview")}
        </Text>
      )}
      {failed && !ready && (
        <Alert color="yellow" mb="xs">
          {t("previewFailed")}
        </Alert>
      )}
      <Box mx="auto" w={width} maw="100%">
        <iframe
          ref={frame}
          title={t("previewFrame")}
          sandbox="allow-same-origin allow-scripts allow-forms"
          src={source}
          onLoad={() => frame.current?.contentWindow?.postMessage(latest.current, window.location.origin)}
          style={{
            display: "block",
            border: "1px solid var(--mantine-color-default-border)",
            borderRadius: "var(--mantine-radius-md)",
            width: "100%",
            height: "min(80vh, 1000px)",
            minHeight: 500,
          }}
        />
      </Box>
    </Box>
  );
};
