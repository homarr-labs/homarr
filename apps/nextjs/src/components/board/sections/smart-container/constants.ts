import type { SmartContainerOptions } from "@homarr/validation/smart-container";

export const getSmartContainerChromeHeight = (options: SmartContainerOptions | undefined, rows: number) => {
  if (options?.appearance === "reel" && options.states.length > 1 && rows >= 3) return 140;
  return 44;
};
