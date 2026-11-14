import type { DemoPrototype } from "./types";
import { variantA } from "./variant-a";
import { variantB } from "./variant-b";

export const demoPrototypes = [variantA, variantB] satisfies [DemoPrototype, DemoPrototype];
export const demoPrototypeBoardName = (key: string) => {
  if (key === "A") return "demo-prototype";
  return `demo-prototype-${key.toLowerCase()}`;
};
