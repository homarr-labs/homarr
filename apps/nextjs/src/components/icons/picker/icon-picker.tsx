import type { FocusEventHandler } from "react";
import { useState } from "react";
import {
  Badge,
  Box,
  Card,
  Combobox,
  Group,
  Image,
  InputBase,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

interface IconPickerProps {
  initialValue?: string;
  onChange: (iconUrl: string) => void;
  error?: string | null;
  onFocus?: FocusEventHandler;
  onBlur?: FocusEventHandler;
}

export const IconPicker = ({ initialValue, onChange, error, onFocus, onBlur }: IconPickerProps) => {
  const [value, setValue] = useState<string>(initialValue ?? "");
  const [search, setSearch] = useState(initialValue ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialValue ?? null);

  const t = useI18n();
  const tCommon = useScopedI18n("common");

  const { data, isFetching } = clientApi.icon.findIcons.useQuery({
    searchText: search,
  });

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const notNullableData = data?.icons ?? [];

  const totalOptions = notNullableData.reduce((acc, group) => acc + group.icons.length, 0);

  const groups = notNullableData.map((group) => {
    const options = group.icons.map((item) => (
      <Card
        onClick={() => {
          const value = item.url;
          setValue(value);
          setPreviewUrl(value);
          setSearch(value);
          onChange(value);
          combobox.closeDropdown();
        }}
        key={item.id}
        p="sm"
        pos="relative"
        style={{ overflow: "visible", cursor: "pointer" }}
      >
        <Box w={50} h={50}>
          <Image src={item.url} w={50} h={50} radius="md" />
        </Box>
        {item.url.endsWith(".svg") && (
          <Badge pos="absolute" top={0} right={0} style={{ transform: "translate3d(5px, -8px, 0)" }} size="sm">
            SVG
          </Badge>
        )}
      </Card>
    ));

    return (
      <Paper p="xs">
        <Text mb="sm" size="sm" fw="bold">
          {group.slug}
        </Text>
        <Box display="flex" style={{ gap: 8, flexWrap: "wrap" }}>
          {options}
        </Box>
      </Paper>
    );
  });

  return (
    <Combobox store={combobox} withinPortal>
      <Combobox.Target>
        <InputBase
          rightSection={<Combobox.Chevron />}
          // eslint-disable-next-line @next/next/no-img-element
          leftSection={previewUrl ? <img src={previewUrl} alt="" style={{ width: 20, height: 20 }} /> : null}
          value={search}
          onChange={(event) => {
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
            setSearch(event.currentTarget.value);
            setValue(event.currentTarget.value);
            setPreviewUrl(null);
            onChange(event.currentTarget.value);
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={(event) => {
            onFocus?.(event);
            combobox.openDropdown();
          }}
          onBlur={(event) => {
            onBlur?.(event);
            combobox.closeDropdown();
            setPreviewUrl(value);
            setSearch(value || "");
          }}
          rightSectionPointerEvents="none"
          withAsterisk
          error={error}
          label={tCommon("iconPicker.label")}
          placeholder={tCommon("iconPicker.header", { countIcons: data?.countIcons })}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={350} style={{ overflowY: "auto" }}>
          {totalOptions > 0 ? (
            <Stack gap={4}>{groups}</Stack>
          ) : !isFetching ? (
            <Combobox.Empty>{t("search.nothingFound")}</Combobox.Empty>
          ) : (
            Array(15)
              .fill(0)
              .map((_, index: number) => (
                <Combobox.Option value={`skeleton-${index}`} key={index} disabled>
                  <Skeleton height={25} visible />
                </Combobox.Option>
              ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
