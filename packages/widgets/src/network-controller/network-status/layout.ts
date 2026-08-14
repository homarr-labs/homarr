import type { WidgetComponentProps } from "../../definition";

type NetworkStatusContent = WidgetComponentProps<"networkControllerStatus">["options"]["content"];
type NetworkStatusDisplayMode = WidgetComponentProps<"networkControllerStatus">["displayMode"];

interface NetworkControllerStatusLayoutInput {
  width: number;
  height: number;
  displayMode: NetworkStatusDisplayMode;
  content: NetworkStatusContent;
}

export interface NetworkControllerStatusLayout {
  padding: "xs" | "sm" | "md";
  columns: 1 | 2;
  sourceColumns: 1 | 2;
  showWifi: boolean;
  showWired: boolean;
  cardPadding: 0 | "md";
  withBorder: boolean;
  compact: boolean;
  horizontalStats: boolean;
}

export const getNetworkControllerStatusLayout = ({
  width,
  height,
  displayMode,
  content,
}: NetworkControllerStatusLayoutInput): NetworkControllerStatusLayout => {
  const isAdvanced = displayMode === "advanced";

  return {
    padding: isAdvanced ? "md" : height < 120 ? "xs" : "sm",
    columns: isAdvanced && width >= 560 ? 2 : 1,
    sourceColumns: isAdvanced && width >= 960 ? 2 : 1,
    showWifi: isAdvanced || content === "wifi",
    showWired: isAdvanced || content === "wired",
    cardPadding: isAdvanced ? "md" : 0,
    withBorder: isAdvanced,
    compact: !isAdvanced,
    horizontalStats: !isAdvanced && height < 150 && width >= 200,
  };
};
