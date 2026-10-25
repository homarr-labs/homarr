"use client";

import { useState } from "react";
import { Button, Group, Select, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createModal } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface SetDownloadCategoryModalProps {
  integrationId: string;
  itemId: string;
  name: string;
  category: string;
}

export const SetDownloadCategoryModal = createModal<SetDownloadCategoryModalProps>(({ innerProps, actions }) => {
  const t = useI18n("widget.downloads");
  const tAction = useI18n("common.action");
  const [category, setCategory] = useState(innerProps.category);
  const categories = clientApi.widget.downloads.getCategories.useQuery({ integrationId: innerProps.integrationId });
  const utils = clientApi.useUtils();
  const mutation = clientApi.widget.downloads.setCategory.useMutation({
    onSuccess: () => actions.closeModal(),
    onSettled: () => void utils.widget.downloads.getJobsAndStatuses.invalidate(),
    onError: () => showErrorNotification({ title: t("errors.actionFailed"), message: t("errors.actionFailedMessage") }),
  });
  const canSave =
    categories.isSuccess && category !== innerProps.category && (category === "" || categories.data.includes(category));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave || mutation.isPending) return;
        mutation.mutate({ integrationId: innerProps.integrationId, itemId: innerProps.itemId, category });
      }}
    >
      <Stack>
        <Text size="sm" lineClamp={2}>
          {innerProps.name}
        </Text>
        <Select
          label={t("items.category.columnTitle")}
          value={category}
          onChange={(value) => setCategory(value ?? "")}
          data={[
            { value: "", label: t("setCategory.none") },
            ...(categories.data ?? []).filter(Boolean).map((value) => ({ value, label: value })),
          ]}
          searchable
          allowDeselect={false}
          loading={categories.isPending}
          disabled={!categories.isSuccess || mutation.isPending}
          error={categories.isError ? t("setCategory.loadFailed") : undefined}
        />
        {categories.isError && (
          <Button variant="subtle" onClick={() => void categories.refetch()} loading={categories.isFetching}>
            {tAction("tryAgain")}
          </Button>
        )}
        <Group justify="end">
          <Button variant="subtle" color="gray" onClick={actions.closeModal}>
            {tAction("cancel")}
          </Button>
          <Button type="submit" disabled={!canSave} loading={mutation.isPending}>
            {tAction("saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle: (t) => t("widget.downloads.contextMenu.setCategory"),
  size: "sm",
});
