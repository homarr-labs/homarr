import { useCallback } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import type {
  stringOrTranslation,
  TranslationFunction,
} from "@homarr/translation";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { ButtonProps, GroupProps } from "@homarr/ui";
import { Box, Button, Group } from "@homarr/ui";

import { createModal } from "./creator";

type MaybePromise<T> = T | Promise<T>;

export interface ConfirmModalProps {
  title: string;
  children: ReactNode;
  onConfirm?: () => MaybePromise<void>;
  onCancel?: () => MaybePromise<void>;
  closeOnConfirm?: boolean;
  closeOnCancel?: boolean;
  cancelProps?: ButtonProps & ComponentPropsWithoutRef<"button">;
  confirmProps?: ButtonProps & ComponentPropsWithoutRef<"button">;
  groupProps?: GroupProps;

  labels?: {
    confirm?: stringOrTranslation;
    cancel?: stringOrTranslation;
  };
}

export const ConfirmModal = createModal<Omit<ConfirmModalProps, "title">>(
  ({ actions, innerProps }) => {
    const t = useI18n();
    const {
      children,
      onConfirm,
      onCancel,
      cancelProps,
      confirmProps,
      groupProps,
      labels,
    } = innerProps;

    const closeOnConfirm = innerProps.closeOnConfirm ?? true;
    const closeOnCancel = innerProps.closeOnCancel ?? true;

    const cancelLabel =
      labels?.cancel ?? ((t: TranslationFunction) => t("common.action.cancel"));
    const confirmLabel =
      labels?.confirm ??
      ((t: TranslationFunction) => t("common.action.confirm"));

    const handleCancel = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        typeof cancelProps?.onClick === "function" &&
          cancelProps?.onClick(event);
        typeof onCancel === "function" && (await onCancel());
        closeOnCancel && actions.closeModal();
      },
      [cancelProps?.onClick, onCancel, actions.closeModal],
    );

    const handleConfirm = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        typeof confirmProps?.onClick === "function" &&
          confirmProps?.onClick(event);
        typeof onConfirm === "function" && (await onConfirm());
        closeOnConfirm && actions.closeModal();
      },
      [confirmProps?.onClick, onConfirm, actions.closeModal],
    );

    return (
      <>
        {children && <Box mb="md">{children}</Box>}

        <Group justify="flex-end" {...groupProps}>
          <Button variant="default" {...cancelProps} onClick={handleCancel}>
            {cancelProps?.children || translateIfNecessary(t, cancelLabel)}
          </Button>

          <Button {...confirmProps} onClick={handleConfirm} color="red.9">
            {confirmProps?.children || translateIfNecessary(t, confirmLabel)}
          </Button>
        </Group>
      </>
    );
  },
).withOptions({});
