"use client";

import { useCallback } from "react";
import { IconBinaryTree } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { showErrorNotification } from "@homarr/notifications";
import { useRegisterSpotlightContextActions } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import { SmartHomeEntityStateView } from "./native-view";

export default function SmartHomeEntityStateWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"smartHome-entityState">) {
  const t = useI18n("widget.smartHome-entityState");
  const tCommon = useI18n("common");
  const integrationId = integrationIds[0]!;
  const input = { entityId: options.entityId, integrationId };
  const {
    data: entity,
    isPending: isEntityPending,
    error: entityError,
  } = clientApi.widget.smartHome.entityDetails.useQuery(input);
  const canInteract = useIntegrationsWithInteractAccess().some(({ id }) => id === integrationId);
  const utils = clientApi.useUtils();
  const { mutate, isPending } = clientApi.widget.smartHome.switchEntity.useMutation({
    onSettled: () => void utils.widget.smartHome.entityDetails.invalidate(input),
    onError: () => showErrorNotification({ title: tCommon("error"), message: t("error.toggleFailed") }),
  });
  const isActionable =
    !isEditMode &&
    options.clickable &&
    canInteract &&
    entity !== undefined &&
    !entityError &&
    !isEntityPending &&
    !isPending;
  const handleClick = useCallback(() => {
    if (!isActionable) return;
    mutate({ entityId: options.entityId, integrationId });
  }, [integrationId, isActionable, mutate, options.entityId]);
  useRegisterSpotlightContextActions(
    `smartHome-entityState-${options.entityId}`,
    [
      {
        id: options.entityId,
        name: options.displayName,
        icon: IconBinaryTree,
        interaction() {
          return {
            type: "javaScript",
            onSelect() {
              handleClick();
            },
          };
        },
        disabled: !isActionable,
      },
    ],
    [handleClick, isActionable, options.displayName, options.entityId],
  );
  if (entityError && entity === undefined) throw entityError;
  return (
    <SmartHomeEntityStateView
      options={options}
      entity={entity}
      isEditMode={isEditMode}
      width={width}
      height={height}
      displayMode={displayMode}
      isActionable={isActionable}
      queryErrorLabel={entityError ? t("error.loadFailed") : undefined}
      handleClick={handleClick}
    />
  );
}
