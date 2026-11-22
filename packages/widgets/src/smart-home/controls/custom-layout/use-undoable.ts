import { useCallback, useRef, useState } from "react";

const MAX_STEPS = 50;
// Changes this close together (typing a title, several fields at once) undo as one step.
const MERGE_WINDOW_MS = 600;

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

/** State with undo and redo. Updates that return the same value are ignored. */
export const useUndoable = <T>(initial: T) => {
  const [history, setHistory] = useState<History<T>>({ past: [], present: initial, future: [] });
  const lastChange = useRef(0);

  const update = useCallback((updater: (current: T) => T) => {
    setHistory((current) => {
      const next = updater(current.present);
      if (next === current.present) return current;
      const now = Date.now();
      const merge = now - lastChange.current < MERGE_WINDOW_MS && current.past.length > 0;
      lastChange.current = now;
      return {
        past: merge ? current.past : [...current.past.slice(-(MAX_STEPS - 1)), current.present],
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    lastChange.current = 0;
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (previous === undefined) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
  }, []);

  const redo = useCallback(() => {
    lastChange.current = 0;
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (next === undefined) return current;
      return { past: [...current.past, current.present], present: next, future: rest };
    });
  }, []);

  return {
    value: history.present,
    update,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
};
