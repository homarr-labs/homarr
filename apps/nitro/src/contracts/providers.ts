import type { QueryClient } from "@tanstack/react-query";
import type { ComponentType, ReactNode } from "react";

import type { RenderSnapshot } from "./render";

export const providerOrder = [
  "settings",
  "session",
  "locale",
  "theme",
  "direction",
  "query",
  "jotai",
  "modals",
  "notifications",
  "spotlight",
  "assistant",
] as const;

export type ProviderSlot = (typeof providerOrder)[number];

export interface ProviderProps {
  readonly snapshot: RenderSnapshot;
  readonly queryClient: QueryClient;
  readonly children: ReactNode;
}

export type ProviderContributions = Partial<
  Readonly<Record<Exclude<ProviderSlot, "theme" | "direction" | "query">, ComponentType<ProviderProps>>>
>;
