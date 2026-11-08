"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { requiresConfirmation } from "../../semantics";
import { usePrototypeAction, usePrototypeInteractionBlock, usePrototypePending } from "../../store";
import type { HaAction, HaEntity } from "../../types";
import { needsCode, useEntityDetailOpener } from "../e/details";

export interface EntityRun {
  pending: boolean;
  locked: boolean;
  flash: boolean;
  confirm: HaAction | null;
  request: (action: HaAction) => void;
  accept: () => void;
  cancel: () => void;
}

export const useActionsLocked = () => {
  const blocked = usePrototypeInteractionBlock();
  return blocked !== null;
};

const canSupersede = (action: HaAction) => {
  switch (action.type) {
    case "turnOn":
    case "turnOff":
    case "setBrightness":
    case "setColorTemp":
    case "setTemperature":
    case "setHvacMode":
    case "setPresetMode":
    case "setHumidity":
    case "setPosition":
    case "open":
    case "close":
    case "stop":
    case "lock":
    case "unlock":
    case "setVolume":
    case "selectOption":
    case "setFanPercentage":
    case "vacuumStart":
    case "vacuumReturn":
    case "alarmArm":
    case "alarmDisarm":
      return true;
    default:
      return false;
  }
};

const resolveToggle = (entity: HaEntity, action: HaAction): HaAction => {
  if (action.type !== "toggle") return action;
  if (entity.domain === "cover" || entity.domain === "valve") {
    if (entity.state === "closed") return { type: "open" };
    return { type: "close" };
  }
  if (entity.domain === "climate") {
    if (entity.state !== "off") return { type: "setHvacMode", value: "off" };
    return { type: "setHvacMode", value: entity.attributes.hvacModes?.find((mode) => mode !== "off") ?? "heat" };
  }
  if (entity.state === "on") return { type: "turnOff" };
  return { type: "turnOn" };
};

export const useEntityRun = (entity: HaEntity): EntityRun => {
  const run = usePrototypeAction();
  const pending = usePrototypePending(entity.id);
  const locked = useActionsLocked();
  const openDetails = useEntityDetailOpener(entity.id);
  const [confirm, setConfirm] = useState<HaAction | null>(null);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<number | undefined>(undefined);
  const requestVersion = useRef(0);
  const inFlight = useRef(false);

  useEffect(
    () => () => {
      requestVersion.current++;
      inFlight.current = false;
      window.clearTimeout(flashTimer.current);
    },
    [entity.id],
  );

  const execute = useCallback(
    async (action: HaAction) => {
      if (locked) return;
      if (needsCode(entity, action)) {
        openDetails?.();
        return;
      }
      if ((pending || inFlight.current) && !canSupersede(action)) return;
      const version = ++requestVersion.current;
      inFlight.current = true;
      window.clearTimeout(flashTimer.current);
      setFlash(false);
      const result = await run(entity.id, action).finally(() => {
        if (version === requestVersion.current) inFlight.current = false;
      });
      if (version !== requestVersion.current || result !== "applied") return;
      setFlash(true);
      flashTimer.current = window.setTimeout(() => setFlash(false), 1400);
    },
    [entity, locked, openDetails, pending, run],
  );

  useEffect(() => {
    if (!confirm) return;
    const timer = window.setTimeout(() => setConfirm(null), 4000);
    return () => window.clearTimeout(timer);
  }, [confirm]);

  const request = useCallback(
    (action: HaAction) => {
      if (locked) return;
      const resolved = resolveToggle(entity, action);
      if (needsCode(entity, resolved)) {
        openDetails?.();
        return;
      }
      if ((pending || inFlight.current) && !canSupersede(resolved)) return;
      if (requiresConfirmation(entity, resolved)) {
        setConfirm(resolved);
        return;
      }
      void execute(resolved);
    },
    [entity, execute, locked, openDetails, pending],
  );

  const accept = useCallback(() => {
    if (!confirm) return;
    void execute(confirm);
    setConfirm(null);
  }, [confirm, execute]);

  const cancel = useCallback(() => setConfirm(null), []);

  return { pending, locked, flash, confirm, request, accept, cancel };
};

export const useDraft = <T>(actual: T) => {
  const [draft, setDraft] = useState<T | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const drag = useCallback((value: T) => {
    window.clearTimeout(timer.current);
    setDraft(value);
  }, []);

  const settle = useCallback((value: T) => {
    window.clearTimeout(timer.current);
    setDraft(value);
    timer.current = window.setTimeout(() => setDraft(null), 700);
  }, []);

  return { value: draft ?? actual, drag, settle };
};
