import { iconsList } from "@tabler/icons-react";
import tablerPackage from "@tabler/icons-react/package.json";

export const customJsxTablerIconNames = Object.freeze([...iconsList.default, "pulse"].toSorted());

export const customJsxTablerIconExamples = [
  "server",
  "database",
  "bell",
  "cloud",
  "circle-check",
  "air-conditioning",
  "brand-github",
  "star-filled",
] as const;

export const customJsxTablerIconSpriteBasePath = `/tabler-icons/${tablerPackage.version}`;

// Homarr's legacy `pulse` name (once IconHeartbeat) stays valid for saved widgets; the sprite calls it `heartbeat`.
const spriteAliases: Readonly<Record<string, string>> = { pulse: "heartbeat" };
const FILLED_SUFFIX = "-filled";

/** Where an icon name (e.g. "bolt" or "star-filled") is drawn from: the sprite file and the symbol in it. */
export const getTablerSpriteSymbol = (name: string) => {
  const resolved = spriteAliases[name] ?? name;
  if (resolved.endsWith(FILLED_SUFFIX)) {
    return { sprite: "filled" as const, symbol: `tabler-filled-${resolved.slice(0, -FILLED_SUFFIX.length)}` };
  }
  return { sprite: "outline" as const, symbol: `tabler-${resolved}` };
};
