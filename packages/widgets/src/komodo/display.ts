import type { KomodoResourceStatus } from "@homarr/integrations";

export const komodoStatusColors: Record<KomodoResourceStatus, string> = {
  healthy: "green",
  warning: "yellow",
  error: "red",
  unknown: "gray",
};

export const formatKomodoState = (state: string) =>
  state
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
