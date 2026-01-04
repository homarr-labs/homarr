import type { NotificationData } from "@mantine/notifications";
import { notifications } from "@mantine/notifications";
import IconCheck from "@tabler/icons-react/icons/IconCheck";
import IconX from "@tabler/icons-react/icons/IconX";

export const showSuccessNotification = (props: NotificationData) =>
  notifications.show({
    ...props,
    color: "teal",
    icon: <IconCheck size={20} />,
  });

export const showErrorNotification = (props: NotificationData) =>
  notifications.show({
    ...props,
    color: "red",
    icon: <IconX size={20} />,
  });
