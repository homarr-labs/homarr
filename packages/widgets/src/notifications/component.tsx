"use client";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { getUsableWidgetQueryData } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { NotificationsView } from "./native-view";

export default function NotificationsWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode,
  displayScale = 1,
}: WidgetComponentProps<"notifications">) {
  const notificationsQuery = clientApi.widget.notifications.getNotifications.useQuery({ ...options, integrationIds });
  const notificationData = getUsableWidgetQueryData(notificationsQuery);
  const t = useI18n("widget.notifications");
  const board = useRequiredBoard();
  const interactIntegrations = useIntegrationsWithInteractAccess();
  const utils = clientApi.useUtils();
  const deleteNotification = clientApi.widget.notifications.deleteNotification.useMutation({
    onSuccess: () => utils.widget.notifications.getNotifications.invalidate(),
    onError: () => showErrorNotification({ title: t("deleteFailed"), message: t("deleteFailedMessage") }),
  });
  return (
    <NotificationsView
      options={options}
      notificationData={notificationData}
      width={width}
      height={height}
      displayMode={displayMode}
      displayScale={displayScale}
      isPending={notificationsQuery.isPending}
      itemRadius={board.itemRadius}
      interactIntegrations={interactIntegrations}
      deleteNotification={deleteNotification}
      iconSizes={iconSizes}
    />
  );
}
