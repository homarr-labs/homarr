"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useElementSize } from "@mantine/hooks";

import { useSmartHomeAction, useSmartHomeEntity, useSmartHomeInteractionBlock, useSmartHomePending } from "../store";
import type { HaAction, HaEntity } from "../types";
import { needsCode, withCode } from "./capabilities";
import type { CodeGate } from "./capabilities";
import classes from "./styles.module.css";

export type Tier = "mini" | "wide" | "full";

// Parts of a control its layout element switched off (cover, mode buttons, ...); nothing is hidden by default.
const HiddenPartsContext = createContext<ReadonlySet<string> | null>(null);
export const HiddenPartsProvider = HiddenPartsContext.Provider;

/** Whether a control shows an optional part; the layout editor lets users switch parts off per element. */
export const useShowsPart = (part: string) => useContext(HiddenPartsContext)?.has(part) !== true;

/**
 * An image address that is dropped once it fails to load (a camera without a snapshot, a track without art), so the
 * placeholder shows instead of a broken image. A new address is tried again.
 */
export function useLoadableImage(src: string | undefined) {
  const [failed, setFailed] = useState<string | null>(null);
  // Once the picture is gone (an unavailable camera), a failure is forgotten: the same address may load when it is back.
  if (!src && failed !== null) setFailed(null);
  return {
    src: src && src !== failed ? src : undefined,
    onError: () => setFailed(src ?? null),
  };
}

export const getTier = (width: number, height: number): Tier => {
  if (width < 165) return "mini";
  if (height < 150) return "wide";
  return "full";
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useRunner(entity: HaEntity) {
  const act = useSmartHomeAction();
  const pending = useSmartHomePending(entity.id);
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const request = useRef(0);

  const run = useCallback(
    async (action: HaAction) => {
      const currentRequest = ++request.current;
      window.clearTimeout(timer.current);
      setDone(false);
      const result = await act(entity.id, action);
      if (result !== "applied" || currentRequest !== request.current) return;
      setDone(true);
      timer.current = window.setTimeout(() => setDone(false), 1500);
    },
    [act, entity.id],
  );

  useEffect(() => {
    setDone(false);
    return () => {
      request.current += 1;
      window.clearTimeout(timer.current);
    };
  }, [act, entity.id]);

  return { run, pending, done };
}

export function useHold(onConfirm: () => void, hold: boolean, disabled = false) {
  const [holding, setHolding] = useState(false);
  const cancel = () => setHolding(false);

  useEffect(() => {
    if (disabled) setHolding(false);
  }, [disabled]);

  const onHoldEnd = () => {
    setHolding(false);
    if (disabled || !holding) return;
    onConfirm();
  };

  const bind = hold
    ? {
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
          if (event.button === 0 && !disabled) setHolding(true);
        },
        onPointerUp: cancel,
        onPointerLeave: cancel,
        onPointerCancel: cancel,
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
          if (disabled) return;
          if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
            event.preventDefault();
            setHolding(true);
          }
        },
        onKeyUp: cancel,
        onBlur: cancel,
        onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
      }
    : {
        onClick: () => {
          if (!disabled) onConfirm();
        },
      };

  return { holding: holding && !disabled, bind, onHoldEnd };
}

interface MeasuredProps {
  children: (width: number, height: number) => ReactNode;
}

export function Measured({ children }: MeasuredProps) {
  const { ref, width, height } = useElementSize();
  return (
    <div ref={ref} className={classes.measured}>
      {width > 0 && height > 0 ? children(width, height) : null}
    </div>
  );
}

export interface DetailApi {
  /** `readOnly` keeps a detail opened from a read-only element or card from controlling the entity. */
  open: (entityId: string, options?: { readOnly?: boolean }) => void;
}

export const DetailContext = createContext<DetailApi | null | undefined>(undefined);
export const DetailEntityContext = createContext<string | null>(null);
export const TileEntityContext = createContext<string | null>(null);
export const CodeContext = createContext<string | null>(null);

export const useDeviceControlDisabled = (disabled = false) => {
  const blocked = useSmartHomeInteractionBlock();
  const entityId = useContext(TileEntityContext);
  const entity = useSmartHomeEntity(entityId ?? "");
  return disabled || blocked !== null || entity?.readOnly === true;
};

export const DetailProvider = DetailContext.Provider;

export const useDetailsEnabled = () => {
  const detail = useContext(DetailContext);
  const block = useSmartHomeInteractionBlock();
  return detail !== null && block !== "editing";
};

export const useEntityDetailOpener = (entityId: string | null) => {
  const detail = useContext(DetailContext);
  const enabled = useDetailsEnabled();
  // The detail opens outside this element, so a read-only scope around it has to travel along.
  const readOnly = useSmartHomeInteractionBlock() === "readOnly";
  return useMemo(() => {
    if (!enabled || !detail || !entityId) return null;
    return () => detail.open(entityId, { readOnly });
  }, [enabled, detail, entityId, readOnly]);
};

export const useDetailOpener = () => useEntityDetailOpener(useContext(DetailEntityContext));

export function useCodeGate(entity: HaEntity) {
  const code = useContext(CodeContext);
  const open = useEntityDetailOpener(entity.id);
  return (action: HaAction): CodeGate => {
    if (!needsCode(entity, action)) return { kind: "run", action };
    if (code) return { kind: "run", action: withCode(action, code) };
    if (code === null && open) return { kind: "details", open };
    if (code === null) return { kind: "unsupported" };
    return { kind: "awaitingCode" };
  };
}
