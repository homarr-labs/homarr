import type { BoardSetupPanels } from "~/components/board/board-setup-checklist";

let setupPanelsPromise: Promise<typeof BoardSetupPanels> | undefined;

export const loadBoardSetupPanelsAsync = () => {
  setupPanelsPromise ??= import("~/components/board/board-setup-checklist")
    .then((module) => module.BoardSetupPanels)
    .catch((error: unknown) => {
      setupPanelsPromise = undefined;
      throw error;
    });

  return setupPanelsPromise;
};
