"use client";

import type { FocusEventHandler } from "react";
import { startTransition, useEffect, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Combobox,
  Flex,
  Group,
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
import { useDebouncedValue, useUncontrolled } from "@mantine/hooks";
import { IconMoodEmpty, IconSearchOff, IconUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { supportedLanguages } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";

import { UploadMedia } from "../upload-media/upload-media";
import classes from "./icon-picker.module.css";

interface IconPickerProps {
  value?: string;
  onChange: (iconUrl: string) => void;
  error?: string | null;
  onFocus?: FocusEventHandler;
  onBlur?: FocusEventHandler;
  label?: string;
  placeholder?: string;
  withAsterisk?: boolean;
}

export const IconPicker = ({
  value: propsValue,
  onChange,
  error,
  onFocus,
  onBlur,
  withAsterisk = true,
  label,
  placeholder,
}: IconPickerProps) => {
  const [value, setValue] = useUncontrolled({ value: propsValue, onChange });
  const [query, setQuery] = useState("");

  // ponytail: reset the typed query when the committed value changes
  // externally (form reset, parent re-render) so the input reverts to the URL.
  useEffect(() => {
    setQuery("");
  }, [value]);

  const { data: session } = useSession();
  const tCommon = useScopedI18n("common");
  const [debouncedQuery] = useDebouncedValue(query, 100);

  // ponytail: only search when the typed query differs from the committed
  // value. On mount the input shows the existing URL (edit mode), which
  // would never match the bare filenames in the icon table.
  const searchText = (debouncedQuery !== (value ?? "") && debouncedQuery) || "";

  // ponytail: not useSuspenseQuery — an above Suspense boundary would
  // trigger on every keystroke and the dropdown flash is bad UX.
  const { data, isLoading, isError, refetch } = clientApi.icon.findIcons.useQuery(
    { searchText },
    { placeholderData: (prev) => prev },
  );

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const totalOptions = data?.icons.reduce((acc, group) => acc + group.icons.length, 0) ?? 0;
  const groups = data?.icons.map((group) => {
    const options = group.icons.map((item) => (
      <Combobox.Option
        key={item.id}
        value={item.url}
        p={0}
        h="calc(2*var(--mantine-spacing-sm)+25px)"
        w="calc(2*var(--mantine-spacing-sm)+25px)"
      >
        <UnstyledButton
          onClick={() => {
            startTransition(() => {
              setValue(item.url);
              setQuery("");
              combobox.closeDropdown();
            });
          }}
        >
          <Indicator label="SVG" disabled={!item.url.endsWith(".svg")} size={16}>
            <Card p="sm" pos="relative" style={{ overflow: "visible", cursor: "pointer" }} className={classes.iconCard}>
              <Box w={25} h={25}>
                <Image src={item.url} w={25} h={25} />
              </Box>
            </Card>
          </Indicator>
        </UnstyledButton>
      </Combobox.Option>
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

  // ponytail: show the typed query if non-empty, else fall back to the URL.
  const inputValue = query || value || "";
  // ponytail: show the existing icon as a left-section preview.
  const leftSection = shouldShowPreview(value) && <img src={value} alt="" style={{ width: 20, height: 20 }} />;
  // ponytail: prop override -> real count -> loading text.
  const placeholderText =
    placeholder ||
    (data && tCommon("iconPicker.header", { countIcons: String(data.countIcons) })) ||
    tCommon("iconPicker.headerLoading");

  const renderDropdown = () => {
    if (isError) {
      return (
        <Stack align="center" gap="xs" p="md">
          <IconSearchOff size={32} stroke={1.5} />
          <Text size="sm">{tCommon("iconPicker.error")}</Text>
          <Button size="xs" variant="default" onClick={() => refetch()}>
            {tCommon("action.tryAgain")}
          </Button>
        </Stack>
      );
    }
    if (isLoading) {
      return Array(15)
        .fill(0)
        .map((_, index) => (
          <Combobox.Option value={`skeleton-${index}`} key={index} disabled>
            <Skeleton height={25} visible />
          </Combobox.Option>
        ));
    }
    if (totalOptions > 0) {
      return <Stack gap={4}>{groups}</Stack>;
    }
    return (
      <Stack align="center" gap="xs" p="md">
        <IconMoodEmpty size={32} stroke={1.5} />
        <Text size="sm">{tCommon("iconPicker.noResults", { search: debouncedQuery })}</Text>
      </Stack>
    );
  };

  return (
    <Combobox store={combobox} withinPortal>
      <Combobox.Target>
        <Group wrap="nowrap" gap="xs" w="100%" align="start">
          <InputBase
            flex={1}
            rightSection={<Combobox.Chevron />}
            leftSection={leftSection}
            value={inputValue}
            onChange={(event) => {
              combobox.openDropdown();
              setQuery(event.currentTarget.value);
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={(event) => {
              onFocus?.(event);
              combobox.openDropdown();
            }}
            onBlur={(event) => {
              onBlur?.(event);
              combobox.closeDropdown();
              setQuery("");
            }}
            rightSectionPointerEvents="none"
            withAsterisk={withAsterisk}
            error={error}
            label={label ?? tCommon("iconPicker.label")}
            placeholder={placeholderText}
          />
          {session?.user.permissions.includes("media-upload") && (
            <UploadMedia
              onSuccess={(medias) => {
                const first = medias.at(0);
                if (!first) return;
                startTransition(() => {
                  setValue(first.url);
                });
              }}
            >
              {({ onClick, loading }) => (
                <ActionIcon onClick={onClick} loading={loading} mt={24} size={36} variant="default">
                  <IconUpload size={16} stroke={1.5} />
                </ActionIcon>
              )}
            </UploadMedia>
          )}
        </Group>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options mah={350} style={{ overflowY: "auto" }}>
          {renderDropdown()}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

// This regex is used to prevent loading a preview like en or /en which would trigger a language change
// See https://github.com/homarr-labs/homarr/issues/3070
const localizationPathRegex = new RegExp(`^/?(${supportedLanguages.join("|")})(/.*)?$`, "i");
const shouldShowPreview = (value: string | null | undefined): value is string => {
  if (!value) return false;
  return !localizationPathRegex.test(value);
};
