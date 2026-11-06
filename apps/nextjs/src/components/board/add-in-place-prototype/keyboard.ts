"use client";

import type { KeyboardEvent } from "react";

import { addInPlaceActions } from "./store";

const arrowDeltas: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

export const useAreaKeyboard = () => (event: KeyboardEvent) => {
  if (event.altKey) {
    const delta = arrowDeltas[event.key];
    if (delta) {
      event.preventDefault();
      addInPlaceActions.resizeBy(delta[0], delta[1]);
    }
    return;
  }
  if (event.key === "Escape" && !event.defaultPrevented) {
    event.preventDefault();
    event.stopPropagation();
    addInPlaceActions.back();
  }
};
