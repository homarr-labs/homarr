import type { HomarrBundle } from "../schema";

export const bundleToJson = (bundle: HomarrBundle) => {
  return JSON.stringify(bundle, null, 2);
};

export const bundleFilenameForBoard = (boardName: string) => {
  const sanitized = boardName.replace(/[^A-Za-z0-9-_]/g, "-");
  return `homarr-board-${sanitized}.json`;
};
