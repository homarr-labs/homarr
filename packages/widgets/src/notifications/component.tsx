"use client";

import { Flex } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";

export default function NotificationsWidget({ options, integrationIds }: WidgetComponentProps<"notifications">) {
  const [notificationIntegrations] = clientApi.widget.notifications.getNotifications.useSuspenseQuery(
    {
      ...options,
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const utils = clientApi.useUtils();

  clientApi.widget.notifications.subscribeNotifications.useSubscription(
    {
      ...options,
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.notifications.getNotifications.setData({ ...options, integrationIds }, (prevData) => {
          return prevData?.map((item) => {
            if (item.integration.id !== data.integration.id) return item;

            return {
              data: data.data,
              integration: {
                ...data.integration,
                updatedAt: new Date(),
              },
            };
          });
        });
      },
    },
  );

  //const t = useScopedI18n("widget.");

  return (
    <Flex
      className="minecraftServerStatus-wrapper"
      h="100%"
      w="100%"
      direction="column"
      p="sm"
      justify="center"
      align="center"
    >
      {notificationIntegrations.map((n) => n.data.map((d) => d.body))}
    </Flex>
  );
}
