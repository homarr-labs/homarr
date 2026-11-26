import { useCallback, useState } from "react";

const MAX_STEPS = 50;
// Changes this close together (typing a title, several fields at once) undo as one step.
const MERGE_WINDOW_MS = 600;

interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** When the present was last edited; 0 after undo and redo, so the next edit starts its own step. */
  editedAt: number;
}

/** State with undo and redo. Updates that return the same value are ignored. */
export const useUndoable = <T>(initial: () => T) => {
  const [history, setHistory] = useState<History<T>>(() => ({ past: [], present: initial(), future: [], editedAt: 0 }));

  const update = useCallback((updater: (current: T) => T) => {
    // Taken once, outside the state updater, which React may run twice: both runs then decide alike.
    const now = Date.now();
    setHistory((current) => {
      const next = updater(current.present);
      if (next === current.present) return current;
      const merge = now - current.editedAt < MERGE_WINDOW_MS && current.past.length > 0;
      return {
        past: merge ? current.past : [...current.past.slice(-(MAX_STEPS - 1)), current.present],
        present: next,
        future: [],
        editedAt: now,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (previous === undefined) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
        editedAt: 0,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (next === undefined) return current;
      return { past: [...current.past, current.present], present: next, future: rest, editedAt: 0 };
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
