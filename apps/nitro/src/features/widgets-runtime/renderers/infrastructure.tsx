import type { WidgetComponentProps } from "@homarr/widgets/definition";
import { LlamacppView, UpsView, WudView } from "@homarr/widgets/common/native-read-rendering";
import type { WudViewProps } from "@homarr/widgets/common/native-read-rendering";
import { NoIntegrationSelectedError } from "@homarr/widgets/errors/classes";

import { useLlamacppQuery, useUpsQuery, useWudQuery } from "../generated-hooks";
import { getUsableNativeWidgetData } from "../query-state";

export function NativeLlamacppRenderer(props: WidgetComponentProps<"llamacpp">) {
  const integrationId = props.integrationIds[0];
  if (!integrationId) throw new NoIntegrationSelectedError();
  return <LlamacppContent {...props} integrationId={integrationId} />;
}

function LlamacppContent({
  integrationId,
  options,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"llamacpp"> & { integrationId: string }) {
  const { data, isError } = useLlamacppQuery({ integrationId });
  return (
    <LlamacppView
      data={data}
      isError={isError}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
    />
  );
}

export function NativeUpsRenderer({
  options,
  integrationIds,
  width,
  height,
  displayMode = "compact",
  displayScale = 1,
}: WidgetComponentProps<"ups">) {
  if (integrationIds.length === 0) throw new NoIntegrationSelectedError();
  let responsiveWidth = width;
  let responsiveHeight = height;
  if (displayMode !== "advanced") {
    responsiveWidth *= displayScale;
    responsiveHeight *= displayScale;
  }
  return (
    <UpsContent
      options={options}
      integrationIds={integrationIds}
      width={responsiveWidth}
      height={responsiveHeight}
      displayMode={displayMode}
    />
  );
}

type UpsContentProps = Pick<WidgetComponentProps<"ups">, "options" | "integrationIds" | "width" | "height"> & {
  displayMode: "compact" | "advanced";
};

function UpsContent({ integrationIds, options, width, height, displayMode }: UpsContentProps) {
  const query = useUpsQuery({ integrationIds });
  const data = getUsableNativeWidgetData(query);
  return <UpsView data={data} options={options} width={width} height={height} displayMode={displayMode} />;
}

export type WudRendererPresentation = Pick<WudViewProps, "itemRadius" | "zoomCompensatedSize">;

export function createNativeWudRenderer(presentation: WudRendererPresentation) {
  function WudContent({
    integrationId,
    options,
    width,
    displayMode,
  }: WidgetComponentProps<"wud"> & { integrationId: string }) {
    const { data } = useWudQuery({ integrationId });
    return (
      <WudView data={data} options={options} width={width} isAdvanced={displayMode === "advanced"} {...presentation} />
    );
  }
  return function NativeWudRenderer(props: WidgetComponentProps<"wud">) {
    const integrationId = props.integrationIds[0];
    if (!integrationId) return null;
    return <WudContent {...props} integrationId={integrationId} />;
  };
}
