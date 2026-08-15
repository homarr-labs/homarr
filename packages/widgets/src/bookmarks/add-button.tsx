"use client";

import type { MultiSelectProps } from "@mantine/core";
import { Group, Loader, MultiSelect } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { SortableItemListInput } from "../options";

type SelectableApp = RouterOutputs["app"]["selectable"][number];

export const BookmarkAddButton: SortableItemListInput<SelectableApp, string>["AddButton"] = ({
  addItem,
  removeItem,
  values,
}) => {
  const t = useScopedI18n("widget.bookmarks.option.items.apps");
  const tCommon = useScopedI18n("common");
  const tSelect = useScopedI18n("app.action.select");
  const { data: apps = [], isPending, error } = clientApi.app.selectable.useQuery();
  const appsById = new Map(apps.map((app) => [app.id, app]));

  const handleChange = (nextValues: string[]) => {
    const nextIds = new Set(nextValues);
    for (const value of values) {
      if (!nextIds.has(value)) removeItem(value);
    }

    const currentIds = new Set(values);
    for (const value of nextValues) {
      if (currentIds.has(value)) continue;
      const app = appsById.get(value);
      if (app) addItem(app);
    }
  };

  return (
    <MultiSelect
      label={t("label")}
      placeholder={t("placeholder")}
      value={values}
      onChange={handleChange}
      searchable
      clearable
      clearSearchOnChange
      hidePickedOptions
      disabled={isPending || Boolean(error)}
      error={error ? tCommon("error") : undefined}
      rightSection={isPending ? <Loader size="xs" /> : undefined}
      nothingFoundMessage={tSelect("notFound")}
      renderOption={renderAppOption}
      data={apps.map((app) => ({
        value: app.id,
        label: app.name,
        iconUrl: app.iconUrl,
      }))}
    />
  );
};

const iconProps = {
  stroke: 1.5,
  color: "currentColor",
  opacity: 0.6,
  size: 18,
};

const renderAppOption: MultiSelectProps["renderOption"] = ({ option, checked }) => (
  <Group flex="1" gap="xs">
    {"iconUrl" in option && typeof option.iconUrl === "string" ? (
      <img width={20} height={20} src={option.iconUrl} alt="" />
    ) : null}
    {option.label}
    {checked && <IconCheck style={{ marginInlineStart: "auto" }} {...iconProps} />}
  </Group>
);
