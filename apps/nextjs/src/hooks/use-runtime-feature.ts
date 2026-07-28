"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

export const useRuntimeFeature = (feature: "custom-widgets" | "workshop") =>
  useSyncExternalStore(
    subscribe,
    () => document.querySelector<HTMLMetaElement>(`meta[name="homarr-${feature}-enabled"]`)?.content !== "false",
    () => true,
  );
