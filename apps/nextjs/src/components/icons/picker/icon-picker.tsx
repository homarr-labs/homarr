import type { FocusEventHandler } from "react";
import { startTransition, useState } from "react";
import {
  Box,
  Card,
  Combobox,
  Flex,
  Image,
  Indicator,
  InputBase,
  Paper,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

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

  const tCommon = useScopedI18n("common");

  const [debouncedSearch] = useDebouncedValue(search, 100);

  // We use not useSuspenseQuery as it would cause an above Suspense boundary to trigger and so searching for something is bad UX.
  const { data, isLoading } = clientApi.icon.findIcons.useQuery({
    searchText: debouncedSearch,
  });

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const totalOptions = data?.icons.reduce((acc, group) => acc + group.icons.length, 0) ?? 0;
  const groups = data?.icons.map((group) => {
    const options = group.icons.map((item) => (
      <UnstyledButton
        onClick={() => {
          const value = item.url;
          startTransition(() => {
            setValue(value);
            setPreviewUrl(value);
            setSearch(value);
            onChange(value);
            combobox.closeDropdown();
          });
        }}
        key={item.id}
      >
        <Indicator label="SVG" disabled={!item.url.endsWith(".svg")} size={16}>
          <Card
            p="sm"
            pos="relative"
            style={{
              overflow: "visible",
              cursor: "pointer",
            }}
          >
            <Box w={25} h={25}>
              <Image src={item.url} w={25} h={25} radius="md" />
            </Box>
          </Card>
        </Indicator>
      </UnstyledButton>
    ));

    return (
      <Paper p="xs" key={group.slug} pt={2}>
        <Text mb={8} size="sm" fw="bold">
          {group.slug}
        </Text>
        <Flex gap={8} wrap={"wrap"}>
          {options}
        </Flex>
      </Paper>
    );
  });

  return (
    <Combobox store={combobox} withinPortal>
      <Combobox.Target>
        <InputBase
          rightSection={<Combobox.Chevron />}
          leftSection={
            previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" style={{ width: 20, height: 20 }} />
            ) : null
          }
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
          placeholder={tCommon("iconPicker.header", { countIcons: data?.countIcons ?? 0 })}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={350} style={{ overflowY: "auto" }}>
          {totalOptions > 0 ? (
            <Stack gap={4}>{groups}</Stack>
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
