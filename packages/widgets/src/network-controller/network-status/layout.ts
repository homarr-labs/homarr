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
  padding: 4 | "xs" | "sm" | "md";
  columns: 1 | 2;
  sourceColumns: 1 | 2;
  showWifi: boolean;
  showWired: boolean;
  cardPadding: 0 | "md";
  withBorder: boolean;
  compact: boolean;
  horizontalStats: boolean;
  inlineStats: boolean;
}

export const getNetworkControllerStatusLayout = ({
  width,
  height,
  displayMode,
  content,
}: NetworkControllerStatusLayoutInput): NetworkControllerStatusLayout => {
  const isAdvanced = displayMode === "advanced";
  const compact = !isAdvanced && (width < 240 || height < 180);

  return {
    padding: isAdvanced ? "md" : height < 120 ? 4 : "sm",
    columns: isAdvanced && width >= 560 ? 2 : 1,
    sourceColumns: isAdvanced && width >= 960 ? 2 : 1,
    showWifi: isAdvanced || content === "wifi",
    showWired: isAdvanced || content === "wired",
    cardPadding: isAdvanced ? "md" : 0,
    withBorder: isAdvanced,
    compact,
    horizontalStats: compact && height < 150,
    inlineStats: compact && height < 80,
  };
};
