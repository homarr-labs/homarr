import type { NotificationProps } from "@mantine/core";
import type { ReactNode } from "react";

export interface SourceNotificationData extends Omit<NotificationProps, "onClose" | "children"> {
  readonly id?: string;
  readonly message: ReactNode;
  readonly autoClose?: boolean | number;
  readonly allowClose?: boolean;
  readonly onOpen?: (notification: SourceNotificationData) => void;
  readonly onClose?: (notification: SourceNotificationData) => void;
}

export interface SourceNotificationActions {
  readonly show: (notification: SourceNotificationData) => string;
  readonly update: (notification: SourceNotificationData & { readonly id: string }) => string | undefined;
  readonly hide: (id: string) => string;
  readonly clean: () => void;
  readonly cleanQueue: () => void;
}

export interface SourceNotificationIcons {
  readonly success: ReactNode;
  readonly error: ReactNode;
  readonly warning: ReactNode;
}

export type NotificationOutcome =
  | { readonly kind: "success"; readonly notification: SourceNotificationData }
  | { readonly kind: "error"; readonly notification: SourceNotificationData }
  | { readonly kind: "warning"; readonly notification: SourceNotificationData };

export function createSourceNotificationFeedback(actions: SourceNotificationActions, icons: SourceNotificationIcons) {
  const { show, update, hide, clean, cleanQueue } = actions;
  const sourceIcons = Object.freeze({ ...icons });

  function present(outcome: NotificationOutcome): SourceNotificationData {
    const color = outcome.kind === "success" ? "teal" : outcome.kind === "error" ? "red" : "yellow";
    return {
      ...outcome.notification,
      color,
      icon: sourceIcons[outcome.kind],
      loading: false,
    };
  }

  return Object.freeze({
    show: (outcome: NotificationOutcome) => show(present(outcome)),
    pending: (notification: SourceNotificationData) => show({ ...notification, loading: true, autoClose: false }),
    complete: (id: string, outcome: NotificationOutcome) =>
      update({
        ...present(outcome),
        id,
        autoClose: outcome.notification.autoClose ?? true,
        allowClose: outcome.notification.allowClose ?? true,
        withCloseButton: outcome.notification.withCloseButton ?? true,
      }),
    hide,
    clean,
    cleanQueue,
  });
}
