"use client";

// The existing preview runs trusted application code in its own origin. Its CSP,
// replay client, storage isolation and Custom Widget interpreter remain in force.
/* oxlint-disable react/iframe-missing-sandbox */

import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "@mantine/core";

import type { BoardSnapshot, BoardSnapshotPayload } from "../snapshot";
import classes from "./workbench.module.css";

export function SnapshotInspector({ text, label }: { text: string; label: string }) {
  const [loaded, setLoaded] = useState<{ snapshot: BoardSnapshot; payload: BoardSnapshotPayload } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const snapshotRef = useRef<BoardSnapshot | null>(null);

  useEffect(() => {
    const ready = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type !== "homarr-board-preview-ready") return;
      const snapshot = snapshotRef.current;
      if (!snapshot) return;
      frameRef.current?.contentWindow?.postMessage(
        { type: "homarr-board-snapshot", text: JSON.stringify(snapshot) },
        window.location.origin,
      );
    };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, []);

  const inspect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { parseBoardSnapshot } = await import("../snapshot");
      const result = await parseBoardSnapshot(text);
      snapshotRef.current = result.snapshot;
      setLoaded(result);
    } catch {
      setError("This capture does not contain a valid version 1 Homarr board snapshot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.snapshotInspector}>
      {!loaded && (
        <Button variant="subtle" size="xs" loading={loading} onClick={() => void inspect()}>
          Inspect {label.toLowerCase()} snapshot
        </Button>
      )}
      {error && (
        <Alert color="red" role="alert" title="Snapshot unavailable">
          {error}
        </Alert>
      )}
      {loaded && (
        <>
          <p className={classes.snapshotNotice}>
            {label} snapshot is read-only, using this workbench’s renderer. The recorded screenshot above is the
            evidence from the pinned version.
          </p>
          <div className={classes.frameViewport}>
            <iframe
              ref={frameRef}
              title={`${label} snapshot in current renderer`}
              src="/debug/board/preview"
              sandbox="allow-scripts allow-same-origin"
              style={{ width: loaded.payload.viewport.width, height: loaded.payload.viewport.height }}
            />
          </div>
          <div className={classes.snapshotActions}>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                snapshotRef.current = null;
                setLoaded(null);
              }}
            >
              Close {label.toLowerCase()} snapshot
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
