"use client";

import { useEffect, useRef } from "react";
import type { QueryKey } from "@tanstack/react-query";

interface CapturedWidgetState {
  key: QueryKey;
  data: unknown;
}

const collectEvent = "homarr:collect-board-snapshot";

// Local widget state is read only when capture is explicitly requested. It is
// never copied into the normal query cache or persisted by this observer.
export const useBoardSnapshotState = (key: QueryKey, data: unknown) => {
  const current = useRef({ key, data });
  current.current = { key, data };
  useEffect(() => {
    const collect = (event: Event) => {
      if (!(event instanceof CustomEvent) || !Array.isArray(event.detail)) return;
      if (current.current.data !== null) event.detail.push(current.current);
    };
    window.addEventListener(collectEvent, collect);
    return () => window.removeEventListener(collectEvent, collect);
  }, []);
};

export const collectBoardSnapshotState = (): CapturedWidgetState[] => {
  const states: CapturedWidgetState[] = [];
  if (typeof window === "undefined") return states;
  window.dispatchEvent(new CustomEvent(collectEvent, { detail: states }));
  return states;
};
