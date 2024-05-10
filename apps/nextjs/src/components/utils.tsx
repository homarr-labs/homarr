import type { AlertProps } from "@mantine/core";
import { Alert } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface ErrorDisplayProps extends AlertProps {
  title?: string;
  hidden?: boolean;
  message?: string;
  icon?: React.ReactNode;
}

export function ErrorDisplay({
  title = "There was an error",
  message,
  icon,
  hidden = false,
  ...alertProps
}: ErrorDisplayProps) {
  if (hidden) {
    return null;
  }
  return (
    <Alert
      variant="filled"
      color="red"
      title={title}
      icon={icon ? icon : <IconAlertTriangle />}
      {...alertProps}
    >
      {message}
    </Alert>
  );
}
