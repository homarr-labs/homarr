"use client";

import type { KeyboardEvent } from "react";

import { addInPlaceActions } from "./store";

const arrowDeltas: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

export const handleAreaShortcut = (event: KeyboardEvent | globalThis.KeyboardEvent) => {
  const nativeEvent = "nativeEvent" in event ? event.nativeEvent : event;
  if (event.defaultPrevented || nativeEvent.isComposing || !event.altKey || event.metaKey || event.ctrlKey) return;
  const delta = arrowDeltas[event.key];
  if (!delta) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.shiftKey) addInPlaceActions.resizeBy(delta[0], delta[1]);
  else addInPlaceActions.moveBy(delta[0], delta[1]);
};

export const useAreaKeyboard = () => (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.nativeEvent.isComposing) return;
  handleAreaShortcut(event);
  if (event.key === "Escape" && !event.defaultPrevented) {
    event.preventDefault();
    event.stopPropagation();
    addInPlaceActions.back();
  }
};
