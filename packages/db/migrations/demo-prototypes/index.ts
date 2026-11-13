import type { DemoPrototype } from "./types";
import { variantA } from "./variant-a";
import { variantB } from "./variant-b";
import { variantC } from "./variant-c";
import { variantD } from "./variant-d";
import { variantE } from "./variant-e";

export const demoPrototypes = [variantA, variantB, variantC, variantD, variantE] satisfies DemoPrototype[];
export const demoPrototypeBoardName = (key: string) => {
  if (key === "A") return "demo-prototype";
  return `demo-prototype-${key.toLowerCase()}`;
};
