import type { NotificationData } from "@mantine/notifications";
import { notifications } from "@mantine/notifications";

import { IconCheck, IconX, rem } from "@homarr/ui";

type CommonNotificationProps = Pick<NotificationData, "title" | "message">;

export const showSuccessNotification = (props: CommonNotificationProps) =>
  notifications.show({
    ...props,
    color: "teal",
    icon: <IconCheck size={rem(20)} />,
  });

export const showErrorNotification = (props: CommonNotificationProps) =>
  notifications.show({
    ...props,
    color: "red",
    icon: <IconX size={rem(20)} />,
  });
