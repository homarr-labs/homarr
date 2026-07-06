"use client";

import { useTransition } from "react";
import { Button, Tooltip } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface DisableUserButtonProps {
  user: RouterOutputs["user"]["getById"];
  isSelf?: boolean;
}

export const DisableUserButton = ({ user, isSelf = false }: DisableUserButtonProps) => {
  const t = useI18n();
  const [isPending, startTransition] = useTransition();
  const changeDisabledMutation = clientApi.user.changeDisabled.useMutation();
  const isDisabled = user.disabled;

  const getSuccessMessage = () => {
    if (isDisabled) {
      return {
        title: t("user.action.enable.success", { defaultValue: "User enabled" }),
        message: t("user.action.enable.successDescription", { defaultValue: "User has been enabled" }),
      };
    }
    return {
      title: t("user.action.disable.success", { defaultValue: "User disabled" }),
      message: t("user.action.disable.successDescription", { defaultValue: "User has been disabled" }),
    };
  };

  const handleToggle = () => {
    if (isSelf) return;

    startTransition(async () => {
      try {
        await changeDisabledMutation.mutateAsync({
          userId: user.id,
          disabled: !isDisabled,
        });
        showSuccessNotification(getSuccessMessage());
      } catch {
        showErrorNotification({
          title: t("common.notification.update.error"),
          message: t("common.notification.update.error"),
        });
      }
    });
  };

  const getTooltipLabel = () => {
    if (isDisabled) {
      return t("user.action.enable.description", { defaultValue: "Enable this user" });
    }
    return t("user.action.disable.description", { defaultValue: "Disable this user" });
  };

  const getButtonLabel = () => {
    if (isDisabled) {
      return t("user.action.enable.label", { defaultValue: "Enable user" });
    }
    return t("user.action.disable.label", { defaultValue: "Disable user" });
  };

  const getButtonColor = () => (isDisabled ? "green" : "yellow");

  return (
    <Tooltip label={isSelf ? t("user.action.disableSelf.disabled", { defaultValue: "Cannot disable your own account" }) : getTooltipLabel()} position="top">
      <Button
        onClick={handleToggle}
        loading={isPending || changeDisabledMutation.isPending}
        color={getButtonColor()}
        variant="light"
        disabled={isSelf}
      >
        {getButtonLabel()}
      </Button>
    </Tooltip>
  );
};
