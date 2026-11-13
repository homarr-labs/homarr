import type { DemoPrototype } from "./types";
import { variantE } from "./variant-e";

export const demoPrototypes = [variantE] satisfies [DemoPrototype];
export const demoPrototypeBoardName = (key: string) => {
  if (key === "E") return "demo-prototype";
  return `demo-prototype-${key.toLowerCase()}`;
};
