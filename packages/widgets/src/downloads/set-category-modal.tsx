"use client";

import { useState } from "react";
import { Button, Group, Select, Stack, TagsInput, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createModal } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface SetDownloadCategoryModalProps {
  integrationId: string;
  itemId: string;
  name: string;
  category: string | string[];
  multiple: boolean;
}

export const SetDownloadCategoryModal = createModal<SetDownloadCategoryModalProps>(({ innerProps, actions }) => {
  const t = useI18n("widget.downloads");
  const tAction = useI18n("common.action");
  const initialCategories = Array.isArray(innerProps.category)
    ? innerProps.category
    : innerProps.category
      ? [innerProps.category]
      : [];
  const [selectedCategories, setSelectedCategories] = useState(initialCategories);
  const categories = clientApi.widget.downloads.getCategories.useQuery({ integrationId: innerProps.integrationId });
  const utils = clientApi.useUtils();
  const mutationOptions = {
    onSuccess: () => actions.closeModal(),
    onSettled: () => void utils.widget.downloads.getJobsAndStatuses.invalidate(),
    onError: () => showErrorNotification({ title: t("errors.actionFailed"), message: t("errors.actionFailedMessage") }),
  };
  const categoryMutation = clientApi.widget.downloads.setCategory.useMutation(mutationOptions);
  const labelsMutation = clientApi.widget.downloads.setLabels.useMutation(mutationOptions);
  const isSaving = categoryMutation.isPending || labelsMutation.isPending;
  const hasChanges =
    selectedCategories.length !== initialCategories.length ||
    selectedCategories.some((category) => !initialCategories.includes(category));
  const canSave =
    categories.isSuccess &&
    categories.data !== null &&
    hasChanges &&
    selectedCategories.length <= 100 &&
    selectedCategories.every(
      (category) =>
        category.length > 0 && category.length <= 1000 && (innerProps.multiple || categories.data?.includes(category)),
    );
  const inputDisabled = !categories.isSuccess || categories.data === null || isSaving;
  const inputError = categories.isError
    ? t(innerProps.multiple ? "setCategory.labelsLoadFailed" : "setCategory.loadFailed")
    : undefined;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave || isSaving) return;
        const target = { integrationId: innerProps.integrationId, itemId: innerProps.itemId };
        if (innerProps.multiple) {
          labelsMutation.mutate({ ...target, labels: selectedCategories });
        } else {
          categoryMutation.mutate({ ...target, category: selectedCategories[0] ?? "" });
        }
      }}
    >
      <Stack>
        <Text size="sm" lineClamp={2}>
          {innerProps.name}
        </Text>
        {categories.data === null && (
          <Text component="output" size="sm" c="dimmed">
            {t(innerProps.multiple ? "setCategory.transmissionUnsupported" : "setCategory.delugePluginRequired")}
          </Text>
        )}
        {innerProps.multiple ? (
          <TagsInput
            label={t("setCategory.labels")}
            description={t("setCategory.labelsDescription")}
            value={selectedCategories}
            onChange={setSelectedCategories}
            data={categories.data ?? []}
            maxTags={100}
            maxLength={1000}
            splitChars={[]}
            isDuplicate={(value, currentValues) => currentValues.includes(value)}
            loading={categories.isPending}
            disabled={inputDisabled}
            error={inputError}
          />
        ) : (
          <Select
            label={t("items.category.columnTitle")}
            value={selectedCategories[0] ?? ""}
            onChange={(value) => setSelectedCategories(value ? [value] : [])}
            data={[
              { value: "", label: t("setCategory.none") },
              ...(categories.data ?? []).filter(Boolean).map((value) => ({ value, label: value })),
            ]}
            searchable
            allowDeselect={false}
            loading={categories.isPending}
            disabled={inputDisabled}
            error={inputError}
          />
        )}
        {categories.isError && (
          <Button variant="subtle" onClick={() => void categories.refetch()} loading={categories.isFetching}>
            {tAction("tryAgain")}
          </Button>
        )}
        <Group justify="end">
          <Button variant="subtle" color="gray" onClick={actions.closeModal}>
            {tAction("cancel")}
          </Button>
          <Button type="submit" disabled={!canSave} loading={isSaving}>
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
