import type { FocusEventHandler } from "react";
import { useState } from "react";
import {
  Combobox,
  Group,
  Image,
  InputBase,
  Skeleton,
  Text,
  useCombobox,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

interface IconPickerProps {
  initialValue?: string;
  onChange: (iconUrl: string) => void;
  error?: string | null;
  onFocus?: FocusEventHandler;
  onBlur?: FocusEventHandler;
}

export const IconPicker = ({
  initialValue,
  onChange,
  error,
  onFocus,
  onBlur,
}: IconPickerProps) => {
  const [value, setValue] = useState<string>(initialValue ?? "");
  const [search, setSearch] = useState(initialValue ?? "");

  const t = useScopedI18n("common");

  const { data, isFetching } = clientApi.icon.findIcons.useQuery({
    searchText: search,
  });

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const notNullableData = data?.icons ?? [];

  const totalOptions = notNullableData.reduce(
    (acc, group) => acc + group.icons.length,
    0,
  );

  const groups = notNullableData.map((group) => {
    const options = group.icons.map((item) => (
      <Combobox.Option value={item.url} key={item.id}>
        <Group>
          <Image src={item.url} w={20} h={20} />
          <Text>{item.name}</Text>
        </Group>
      </Combobox.Option>
    ));

    return (
      <Combobox.Group label={group.slug} key={group.id}>
        {options}
      </Combobox.Group>
    );
  });

  return (
    <Combobox
      onOptionSubmit={(value) => {
        setValue(value);
        setSearch(value);
        onChange(value);
        combobox.closeDropdown();
      }}
      store={combobox}
      withinPortal
    >
      <Combobox.Target>
        <InputBase
          rightSection={<Combobox.Chevron />}
          value={search}
          onChange={(event) => {
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
            setSearch(event.currentTarget.value);
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={(event) => {
            onFocus?.(event);
            combobox.openDropdown();
          }}
          onBlur={(event) => {
            onBlur?.(event);
            combobox.closeDropdown();
            setSearch(value || "");
          }}
          rightSectionPointerEvents="none"
          withAsterisk
          error={error}
          label="Icon URL"
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Header>
          <Text c="dimmed">
            {t("iconPicker.header", { countIcons: data?.countIcons })}
          </Text>
        </Combobox.Header>
        <Combobox.Options mah={350} style={{ overflowY: "auto" }}>
          {totalOptions > 0 ? (
            groups
          ) : !isFetching ? (
            <Combobox.Empty>{t("search.nothingFound")}</Combobox.Empty>
          ) : (
            Array(15)
              .fill(0)
              .map((_, index: number) => (
                <Combobox.Option
                  value={`skeleton-${index}`}
                  key={index}
                  disabled
                >
                  <Skeleton height={25} visible />
                </Combobox.Option>
              ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
