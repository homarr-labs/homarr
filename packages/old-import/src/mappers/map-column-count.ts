import type { BoardSize, OldmarrConfig } from "@homarr/old-schema";

export const mapColumnCount = (old: OldmarrConfig, screenSize: BoardSize) => {
  switch (screenSize) {
    case "lg":
      return old.settings.customization.gridstack.columnCountLarge;
    case "md":
      return old.settings.customization.gridstack.columnCountMedium;
    case "sm":
      return old.settings.customization.gridstack.columnCountSmall;
    default:
      return 10;
  }
};
