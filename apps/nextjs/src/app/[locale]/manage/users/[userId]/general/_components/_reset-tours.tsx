"use client";

import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

export const ResetTours = () => {
  const t = useScopedI18n("management.page.user.setting.general.item.onboardingTours");
  const utils = clientApi.useUtils();
  const { data: tourStatus } = clientApi.user.getTourStatus.useQuery();
  const { mutate: resetTours, isPending } = clientApi.user.resetTours.useMutation({
    onSuccess() {
      showSuccessNotification({
        title: t("resetSuccess.title"),
        message: t("resetSuccess.message"),
      });
      void utils.user.getTourStatus.invalidate();
    },
  });

  const tours = [
    { key: "management" as const, completed: tourStatus?.completedManageTour ?? false },
    { key: "dashboard" as const, completed: tourStatus?.completedBoardTour ?? false },
  ];

  return (
    <Stack gap="xs">
      <Group gap="xs">
        {tours.map(({ key, completed }) => (
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
