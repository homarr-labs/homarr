"use client";

import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

interface ResetToursProps {
  completedManageTour: boolean;
  completedBoardTour: boolean;
}

export const ResetTours = ({ completedManageTour, completedBoardTour }: ResetToursProps) => {
  const t = useScopedI18n("management.page.user.setting.general.item.onboardingTours");
  const utils = clientApi.useUtils();
  const { mutate: resetTours, isPending } = clientApi.user.resetTours.useMutation({
    onSuccess() {
      showSuccessNotification({
        title: t("resetSuccess.title"),
        message: t("resetSuccess.message"),
      });
      void utils.user.getTourStatus.invalidate();
    },
  });

  const tourStatusMap: Record<string, { key: "management" | "dashboard"; completed: boolean }> = {
    management: { key: "management", completed: completedManageTour },
    dashboard: { key: "dashboard", completed: completedBoardTour },
  };

  return (
    <Stack gap="xs">
      <Group gap="xs">
        {Object.values(tourStatusMap).map(({ key, completed }) => (
          <Badge key={key} color={completed ? "green" : "gray"} variant="light">
            {t(`name.${key}`)}: {completed ? t("status.completed") : t("status.notStarted")}
          </Badge>
        ))}
      </Group>
      <Text size="sm" c="dimmed">
        {t("description")}
      </Text>
      <Button
        leftSection={<IconRefresh size={16} />}
        variant="light"
        size="sm"
        w="fit-content"
        onClick={() => resetTours()}
        loading={isPending}
      >
        {t("reset")}
      </Button>
    </Stack>
  );
};
