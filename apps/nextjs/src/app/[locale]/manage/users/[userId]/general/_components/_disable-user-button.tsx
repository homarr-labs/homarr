"use client";

import { useTransition } from "react";
import { Button, Tooltip } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface DisableUserButtonProps {
  user: RouterOutputs["user"]["getById"];
}

export const DisableUserButton = ({ user }: DisableUserButtonProps) => {
  const t = useI18n();
  const [isPending, startTransition] = useTransition();
  const changeDisabledMutation = clientApi.user.changeDisabled.useMutation();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await changeDisabledMutation.mutateAsync({
          userId: user.id,
          disabled: !user.disabled,
        });
        showSuccessNotification({
          title: user.disabled
            ? t("user.action.enable.success", { defaultValue: "User enabled" })
            : t("user.action.disable.success", { defaultValue: "User disabled" }),
          message: user.disabled
            ? t("user.action.enable.successDescription", { defaultValue: "User has been enabled" })
            : t("user.action.disable.successDescription", { defaultValue: "User has been disabled" }),
        });
      } catch {
        showErrorNotification({
          title: t("common.notification.update.error"),
          message: t("common.notification.update.error"),
        });
      }
    });
  };

  const tooltipLabel = user.disabled
    ? t("user.action.enable.description", { defaultValue: "Enable this user" })
    : t("user.action.disable.description", { defaultValue: "Disable this user" });

  return (
    <Tooltip label={tooltipLabel} position="top">
      <Button
        onClick={handleToggle}
        loading={isPending || changeDisabledMutation.isPending}
        color={user.disabled ? "green" : "yellow"}
        variant="light"
      >
        {user.disabled
          ? t("user.action.enable.label", { defaultValue: "Enable user" })
          : t("user.action.disable.label", { defaultValue: "Disable user" })}
      </Button>
    </Tooltip>
  );
};
