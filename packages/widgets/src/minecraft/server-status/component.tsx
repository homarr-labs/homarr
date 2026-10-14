"use client";

import { Flex, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { WidgetEmptyState } from "../../common/empty-state";
import type { WidgetComponentProps } from "../../definition";
import { MinecraftServerStatusNativeView } from "./native-view";

export default function MinecraftServerStatusWidget({
  options,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"minecraftServerStatus">) {
  const { data: result, isPending, error } = clientApi.widget.minecraft.getServerStatus.useQuery(options);
  const t = useI18n("widget.minecraftServerStatus");
  const tCommon = useI18n("common");
  if (isPending) {
    return (
      <Flex align="center" justify="center" h="100%">
        <Text c="dimmed" size="sm">
          {tCommon("action.loading")}
        </Text>
      </Flex>
    );
  }
  if (error && !result) throw error;
  if (!result) return <WidgetEmptyState />;
  const { data } = result;
  return (
    <MinecraftServerStatusNativeView
      data={data}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
      labels={{ online: t("status.online"), offline: t("status.offline"), bedrock: t("option.isBedrockServer.label") }}
      zoomCompensatedSize={zoomCompensatedSize}
    />
  );
}
