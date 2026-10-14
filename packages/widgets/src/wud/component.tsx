"use client";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { zoomCompensatedSize } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { WudView } from "./native-view";

export default function WudWidget({ integrationIds, options, width, displayMode }: WidgetComponentProps<"wud">) {
  const integrationId = integrationIds[0];
  if (!integrationId) return null;
  return (
    <WudWidgetContent
      integrationId={integrationId}
      options={options}
      width={width}
      isAdvanced={displayMode === "advanced"}
    />
  );
}

const WudWidgetContent = ({
  integrationId,
  options,
  width,
  isAdvanced,
}: {
  integrationId: string;
  options: WidgetComponentProps<"wud">["options"];
  width: number;
  isAdvanced: boolean;
}) => {
  const [data] = clientApi.widget.wud.getStats.useSuspenseQuery({ integrationId });
  const board = useRequiredBoard();
  return (
    <WudView
      data={data}
      options={options}
      width={width}
      isAdvanced={isAdvanced}
      itemRadius={board.itemRadius}
      zoomCompensatedSize={zoomCompensatedSize}
    />
  );
};
