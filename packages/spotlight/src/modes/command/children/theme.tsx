import { useRouter } from "next/navigation";
import { Group, Text } from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { themeIds, themeNames } from "@homarr/definitions";
import { showErrorNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import type { ThemeSelectionId } from "@homarr/validation/theme";

import { createChildrenOptions } from "../../../lib/children";
import { interaction } from "../../../lib/interaction";
import { createCheckmarkPreferenceAction } from "./preferences/action-row";

export const themeChildrenOptions = createChildrenOptions<Record<string, unknown>>({
  useActions: (_, query) => {
    const router = useRouter();
    const utils = clientApi.useUtils();
    const { branding } = useSettings();
    const t = useI18n("common.customTheme");
    const common = useI18n("common");
    const mutation = clientApi.theme.update.useMutation({
      onSuccess: async () => {
        await utils.theme.get.invalidate();
        router.refresh();
      },
      onError: () => showErrorNotification({ message: common("notification.update.error") }),
    });
    const options: { value: ThemeSelectionId; label: string }[] = themeIds.map((value) => ({
      value,
      label: themeNames[value],
    }));
    if (branding.customTheme) options.unshift({ value: "custom", label: t("custom") });
    const normalized = query.trim().toLowerCase();
    const actions = options
      .filter((option) => option.label.toLowerCase().includes(normalized))
      .map((option) =>
        createCheckmarkPreferenceAction({
          key: option.value,
          label: option.label,
          isSelected: option.value === branding.themeId,
          isPending: mutation.isPending,
          onSelect: () => mutation.mutate({ themeId: option.value }),
        }),
      );
    return [
      {
        key: "editor",
        Component: () => (
          <Group mx="md" my="sm" gap="sm">
            <IconAdjustments size={20} />
            <Text>{t("customize")}</Text>
          </Group>
        ),
        useInteraction: interaction.link(() => ({ href: "/manage/settings/theme" })),
      },
      ...actions,
    ];
  },
  DetailComponent: () => {
    const t = useI18n("common.customTheme");
    return (
      <Text mx="md" my="sm">
        {t("label")}
      </Text>
    );
  },
});
