import { useCallback, useEffect, useRef, useState } from "react";

import type { BackupPreviewState, BackupTransport } from "./contracts";
import { maximumBackupFileBytes } from "./contracts";
import { getBackupFailureCode } from "./native-transport";

export function useBackupPreview(transport: BackupTransport) {
  const [state, setState] = useState<BackupPreviewState>({ kind: "empty" });
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    setState({ kind: "empty" });
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [transport]);

  const selectFile = useCallback(
    (file: File | null) => {
      active.current?.abort();
      active.current = null;
      if (!file) {
        setState({ kind: "empty" });
        return;
      }
      if (file.size > maximumBackupFileBytes) {
        setState({ kind: "failed", file, code: "too-large" });
        return;
      }
      const controller = new AbortController();
      active.current = controller;
      setState({ kind: "inspecting", file, phase: "reading" });
      void Promise.resolve()
        .then(() =>
          transport.inspectAsync(file, controller.signal, (phase) => {
            if (active.current === controller && !controller.signal.aborted)
              setState({ kind: "inspecting", file, phase });
          }),
        )
        .then(
          (inspection) => {
            if (active.current === controller && !controller.signal.aborted) {
              setState({ kind: "ready", file, inspection });
              active.current = null;
            }
          },
          (error: unknown) => {
            if (active.current === controller && !controller.signal.aborted) {
              setState({ kind: "failed", file, code: getBackupFailureCode(error) });
              active.current = null;
            }
          },
        );
    },
    [transport],
  );

  return { state, selectFile };
}
