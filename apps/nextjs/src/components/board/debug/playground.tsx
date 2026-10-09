"use client";

// Trusted application code needs its origin for Next.js chunks; uploaded JSX
// uses the Custom Widget interpreter and preview requests are restricted by CSP.
/* oxlint-disable react/iframe-missing-sandbox */

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, FileButton, Group, NativeSelect, Paper, Stack, Text, Title } from "@mantine/core";
import { IconBug, IconUpload } from "@tabler/icons-react";

import { downloadBoardSnapshot, maxSnapshotBytes, parseBoardSnapshot } from "./snapshot";
import type { BoardSnapshot, BoardSnapshotPayload } from "./snapshot";

const storageKey = "homarr-board-debug-snapshot-v1";

export const BoardDebugPlayground = () => {
  const [loaded, setLoaded] = useState<{ snapshot: BoardSnapshot; payload: BoardSnapshotPayload } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState("captured");
  const [frameReady, setFrameReady] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const resetFileRef = useRef<() => void>(null);
  const loadSequence = useRef(0);
  const load = async (text: string) => {
    const sequence = ++loadSequence.current;
    const result = await parseBoardSnapshot(text);
    if (sequence !== loadSequence.current) return;
    setLoaded(result);
    setError(null);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(result.snapshot));
    } catch {
      /* Storage is optional. */
    }
  };
  useEffect(() => {
    try {
      const previous = sessionStorage.getItem(storageKey);
      if (previous)
        void load(previous).catch(() => {
          try {
            sessionStorage.removeItem(storageKey);
          } catch {
            /* Storage is optional. */
          }
        });
    } catch {
      /* Storage is optional. */
    }
  }, []);
  useEffect(() => {
    const handleReady = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "homarr-board-preview-ready") setFrameReady((count) => count + 1);
    };
    window.addEventListener("message", handleReady);
    return () => window.removeEventListener("message", handleReady);
  }, []);
  useEffect(() => {
    if (!loaded || !frameReady) return;
    frameRef.current?.contentWindow?.postMessage(
      { type: "homarr-board-snapshot", text: JSON.stringify(loaded.snapshot) },
      window.location.origin,
    );
  }, [loaded, frameReady]);
  const upload = async (file: File | null) => {
    resetFileRef.current?.();
    if (!file) return;
    if (file.size > maxSnapshotBytes) {
      setError("Snapshot exceeds the 10 MB limit.");
      return;
    }
    try {
      await load(await file.text());
    } catch {
      setError("This file is not a valid version 1 Homarr board snapshot.");
    }
  };
  const clear = () => {
    loadSequence.current++;
    setLoaded(null);
    setFrameReady(0);
    setError(null);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Storage is optional. */
    }
  };
  let viewportWidth = 1440;
  if (loaded) viewportWidth = loaded.payload.viewport.width;
  if (width !== "captured") viewportWidth = Number(width);
  return (
    <Stack p="lg" gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="xs">
            <IconBug size={24} />
            <Title order={2}>Board playground</Title>
            <Badge color="orange">Debug</Badge>
          </Group>
          <Text c="dimmed" mt="xs">
            Replay a snapshot with the current widget UI. Actions and live connections are disabled.
          </Text>
        </div>
        <Group>
          <FileButton accept="application/json,.json" onChange={(file) => void upload(file)} resetRef={resetFileRef}>
            {(props) => (
              <Button {...props} leftSection={<IconUpload size={16} />}>
                Load snapshot
              </Button>
            )}
          </FileButton>
          {loaded && (
            <Button variant="default" onClick={() => downloadBoardSnapshot(loaded.snapshot)}>
              Download JSON
            </Button>
          )}
          {loaded && (
            <Button variant="subtle" onClick={clear}>
              Clear
            </Button>
          )}
        </Group>
      </Group>
      {error && (
        <Alert color="red" title="Unable to load snapshot">
          {error}
        </Alert>
      )}
      {!loaded && (
        <Paper withBorder p="xl">
          <Stack align="center" py="xl">
            <IconUpload size={36} />
            <Title order={3}>Load a board snapshot</Title>
            <Text c="dimmed" ta="center">
              On a dashboard, open CMD+K and select “Take snapshot of board state”.
              <br />
              Load the downloaded JSON here to start replaying it.
            </Text>
          </Stack>
        </Paper>
      )}
      {loaded && (
        <>
          <Group justify="space-between">
            <Group gap="sm">
              <Badge variant="light">{loaded.payload.board.items.length} widgets</Badge>
              <Badge variant="light">{loaded.payload.queries.length} captured queries</Badge>
              <Text size="sm" c="dimmed">
                {new Date(loaded.snapshot.capturedAt).toLocaleString()}
              </Text>
            </Group>
            <NativeSelect
              aria-label="Preview viewport"
              value={width}
              onChange={(event) => setWidth(event.currentTarget.value)}
              data={[
                { value: "captured", label: `Captured · ${loaded.payload.viewport.width}px` },
                { value: "1440", label: "Desktop · 1440px" },
                { value: "768", label: "Tablet · 768px" },
                { value: "390", label: "Mobile · 390px" },
              ]}
            />
          </Group>
          <Text size="xs" c="dimmed">
            Text and identifiers are anonymized. URLs, credentials, rich text and custom CSS are removed. Only data
            loaded when the snapshot was taken is available.
          </Text>
          <div style={{ overflow: "auto", width: "100%" }}>
            {/* The frame runs our application code. Uploaded JSX is interpreted by the existing Custom Widget sandbox. */}
            <iframe
              ref={frameRef}
              title="Board snapshot preview"
              src="/debug/board/preview"
              sandbox="allow-scripts allow-same-origin"
              style={{
                display: "block",
                boxSizing: "content-box",
                width: viewportWidth,
                height: Math.max(600, loaded.payload.viewport.height),
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: 8,
              }}
            />
          </div>
        </>
      )}
    </Stack>
  );
};
