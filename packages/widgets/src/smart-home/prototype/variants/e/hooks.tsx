"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useElementSize } from "@mantine/hooks";

import { usePrototypeAction, usePrototypeEntity, usePrototypeInteractionBlock, usePrototypePending } from "../../store";
import type { HaAction, HaEntity } from "../../types";
import { needsCode, withCode } from "./capabilities";
import type { CodeGate } from "./capabilities";
import classes from "./styles.module.css";

export type Tier = "mini" | "wide" | "full";

export const getTier = (width: number, height: number): Tier => {
  if (width < 165) return "mini";
  if (height < 150) return "wide";
  return "full";
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useRunner(entity: HaEntity) {
  const act = usePrototypeAction();
  const pending = usePrototypePending(entity.id);
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
  open: (entityId: string) => void;
}

export const DetailContext = createContext<DetailApi | null | undefined>(undefined);
export const DetailEntityContext = createContext<string | null>(null);
export const TileEntityContext = createContext<string | null>(null);
export const CodeContext = createContext<string | null>(null);

export const useDeviceControlDisabled = (disabled = false) => {
  const blocked = usePrototypeInteractionBlock();
  const entityId = useContext(TileEntityContext);
  const entity = usePrototypeEntity(entityId ?? "");
  return disabled || blocked !== null || entity?.readOnly === true;
};

export const DetailProvider = DetailContext.Provider;

export const useDetailsEnabled = () => {
  const detail = useContext(DetailContext);
  const block = usePrototypeInteractionBlock();
  return detail !== null && block !== "editing";
};

export const useEntityDetailOpener = (entityId: string | null) => {
  const detail = useContext(DetailContext);
  const enabled = useDetailsEnabled();
  return useMemo(() => {
    if (!enabled || !detail || !entityId) return null;
    return () => detail.open(entityId);
  }, [enabled, detail, entityId]);
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
