"use client";

import type { FocusEventHandler, KeyboardEventHandler } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  CloseButton,
  Combobox,
  Group,
  Image,
  InputBase,
  Loader,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue, useUncontrolled } from "@mantine/hooks";
import {
  IconCheck,
  IconCloud,
  IconMoodEmpty,
  IconPhoto,
  IconPhotoOff,
  IconSearchOff,
  IconUpload,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { supportedLanguages } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";

import { UploadMedia } from "../upload-media/upload-media";
import { arrangeIconPickerSections, isDirectImageUrl, isImageSource, isSvgImage } from "./icon-picker.utils";
import classes from "./icon-picker.module.css";

interface IconPickerProps {
  value?: string;
  onChange: (iconUrl: string) => void;
  error?: string | null;
  onFocus?: FocusEventHandler;
  onBlur?: FocusEventHandler;
  label?: string;
  placeholder?: string;
  suggestedSearch?: string | null;
  withAsterisk?: boolean;
}

type PreviewState = "idle" | "loading" | "ready" | "error";

export const IconPicker = ({
  value: propsValue,
  onChange,
  error,
  onFocus,
  onBlur,
  withAsterisk = true,
  label,
  placeholder,
  suggestedSearch,
}: IconPickerProps) => {
  const [value, setValue] = useUncontrolled({ value: propsValue, onChange, defaultValue: "" });
  const [draft, setDraft] = useState(propsValue ?? "");
  const [hasEdited, setHasEdited] = useState(false);
  const [keyboardIndex, setKeyboardIndex] = useState(-1);
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const { data: session } = useSession();
  const tCommon = useScopedI18n("common");
  const [debouncedDraft] = useDebouncedValue(draft, 250);

  const directUrl = isDirectImageUrl(draft) ? draft.trim() : null;
  const isCommittedValueDraft = debouncedDraft === (value ?? "");
  const searchText = directUrl !== null || isCommittedValueDraft ? "" : debouncedDraft.trim();
  const canUpload = session?.user.permissions.includes("media-upload") ?? false;

  const query = clientApi.icon.findIcons.useQuery(
    { searchText, limitPerGroup: 24 },
    { enabled: directUrl === null, placeholderData: (previous) => previous },
  );

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  useEffect(() => {
    setDraft(value ?? "");
    setHasEdited(false);
  }, [value]);

  useEffect(() => {
    setPreviewState(directUrl ? "loading" : "idle");
  }, [directUrl]);

  const sections = useMemo(
    () => arrangeIconPickerSections(query.data?.icons ?? [], searchText),
    [query.data?.icons, searchText],
  );
  const orderedOptions = useMemo(
    () => [...sections.local, ...sections.svg, ...sections.other],
    [sections.local, sections.svg, sections.other],
  );
  const totalOptions = sections.local.length + sections.svg.length + sections.other.length;

  const commitValue = (nextValue: string) => {
    startTransition(() => {
      setValue(nextValue);
      setDraft(nextValue);
      setHasEdited(false);
      setKeyboardIndex(-1);
    });
  };

  const clearValue = () => {
    commitValue("");
    combobox.openDropdown("keyboard");
  };

  const openWithSuggestedSearch = () => {
    if (!draft && !value && !hasEdited && suggestedSearch?.trim()) {
      setDraft(suggestedSearch.trim());
    }
    combobox.openDropdown();
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Backspace") {
      event.preventDefault();
      clearValue();
      return;
    }

    if (event.key === "Escape") {
      setDraft(value ?? "");
      setHasEdited(false);
      combobox.closeDropdown("keyboard");
      return;
    }

    if (!directUrl && orderedOptions.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      combobox.openDropdown("keyboard");
      setKeyboardIndex((current) => {
        const next =
          event.key === "ArrowDown"
            ? current >= orderedOptions.length - 1
              ? 0
              : current + 1
            : current <= 0
              ? orderedOptions.length - 1
              : current - 1;
        combobox.selectOption(next);
        return next;
      });
      return;
    }

    if (event.key === "Enter") {
      if (keyboardIndex >= 0 && orderedOptions[keyboardIndex]) {
        event.preventDefault();
        commitValue(orderedOptions[keyboardIndex].url);
        combobox.closeDropdown("keyboard");
      } else if (isImageSource(draft)) {
        event.preventDefault();
        commitValue(draft.trim());
        combobox.closeDropdown("keyboard");
      }
    }
  };

  const renderIconOptions = (icons: typeof sections.local, offset: number) => (
    <SimpleGrid className={classes.iconGrid} spacing={6} verticalSpacing={6}>
      {icons.map((icon, index) => (
        <Tooltip key={icon.id} label={`${icon.name} · ${icon.repositorySlug}`} openDelay={500}>
          <Combobox.Option
            value={icon.url}
            aria-label={icon.name}
            active={icon.url === value || keyboardIndex === offset + index}
            className={classes.iconOption}
          >
            <Image src={icon.url} alt="" w={30} h={30} fit="contain" fallbackSrc="/logo/logo.png" />
            {isSvgImage(icon.url) && <span className={classes.formatBadge}>SVG</span>}
          </Combobox.Option>
        </Tooltip>
      ))}
    </SimpleGrid>
  );

  const renderSearchResults = () => {
    if (query.isError) {
      return (
        <PickerMessage
          icon={<IconSearchOff size={22} />}
          title={tCommon("iconPicker.error")}
          action={
            <Button size="xs" variant="default" onClick={() => query.refetch()}>
              {tCommon("action.tryAgain")}
            </Button>
          }
        />
      );
    }

    if (query.isLoading) {
      return (
        <SimpleGrid className={classes.iconGrid} spacing={6} verticalSpacing={6} p="xs">
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} height={52} radius="md" />
          ))}
        </SimpleGrid>
      );
    }

    if (totalOptions === 0) {
      return (
        <PickerMessage
          icon={<IconMoodEmpty size={22} />}
          title={tCommon("iconPicker.noResults", { search: debouncedDraft.trim() })}
        />
      );
    }

    return (
      <Stack gap="sm" p="xs">
        {sections.local.length > 0 && (
          <PickerSection icon={<IconPhoto size={15} />} label={tCommon("iconPicker.localImages")}>
            {renderIconOptions(sections.local, 0)}
          </PickerSection>
        )}
        {sections.svg.length > 0 && (
          <PickerSection label={tCommon("iconPicker.svgIcons")} badge="SVG">
            {renderIconOptions(sections.svg, sections.local.length)}
          </PickerSection>
        )}
        {sections.other.length > 0 && (
          <PickerSection icon={<IconCloud size={15} />} label={tCommon("iconPicker.otherImages")}>
            {renderIconOptions(sections.other, sections.local.length + sections.svg.length)}
          </PickerSection>
        )}
      </Stack>
    );
  };

  const leftSection = (() => {
    if (directUrl && previewState === "loading") return <Loader size={15} />;
    if (directUrl && previewState === "error") return <IconPhotoOff size={17} color="var(--mantine-color-red-6)" />;
    if (shouldShowPreview(value)) {
      return (
        <Image
          src={value}
          alt=""
          w={22}
          h={22}
          fit="contain"
          onLoad={() => directUrl && setPreviewState("ready")}
          onError={() => directUrl && setPreviewState("error")}
        />
      );
    }
    return <IconPhoto size={17} stroke={1.5} />;
  })();

  const placeholderText =
    placeholder ??
    (query.data
      ? tCommon("iconPicker.header", { countIcons: String(query.data.countIcons) })
      : tCommon("iconPicker.headerLoading"));

  return (
    <Combobox
      store={combobox}
      withinPortal
      resetSelectionOnOptionHover
      onOptionSubmit={(url) => {
        commitValue(url);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target withExpandedAttribute>
        <InputBase
          flex={1}
          leftSection={leftSection}
          rightSection={
            <Group gap={2} wrap="nowrap">
              {canUpload && (
                <UploadMedia
                  onSuccess={(medias) => {
                    const first = medias.at(0);
                    if (!first) return;
                    commitValue(first.url);
                    combobox.closeDropdown();
                  }}
                >
                  {({ onClick, loading }) => (
                    <Tooltip label={tCommon("iconPicker.uploadImage")}>
                      <ActionIcon
                        onClick={(event) => {
                          event.stopPropagation();
                          onClick();
                        }}
                        loading={loading}
                        size="sm"
                        variant="subtle"
                        aria-label={tCommon("iconPicker.uploadImage")}
                      >
                        <IconUpload size={16} stroke={1.5} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </UploadMedia>
              )}
              {(draft || value) && (
                <CloseButton
                  size="sm"
                  aria-label={tCommon("iconPicker.clear")}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={clearValue}
                />
              )}
              {query.isFetching && !directUrl ? <Loader size={14} /> : <Combobox.Chevron />}
            </Group>
          }
          rightSectionWidth={canUpload ? 86 : 56}
          rightSectionPointerEvents="all"
          value={draft}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            setDraft(nextValue);
            setHasEdited(true);
            setKeyboardIndex(-1);
            combobox.openDropdown("keyboard");
            combobox.updateSelectedOptionIndex();

            if (!nextValue) {
              setValue("");
            } else if (isImageSource(nextValue)) {
              setValue(nextValue.trim());
            }
          }}
          onKeyDown={handleKeyDown}
          onClick={openWithSuggestedSearch}
          onFocus={(event) => {
            onFocus?.(event);
            openWithSuggestedSearch();
          }}
          onBlur={(event) => {
            onBlur?.(event);
            combobox.closeDropdown();
            setDraft(value ?? "");
            setHasEdited(false);
          }}
          withAsterisk={withAsterisk}
          error={error}
          label={label ?? tCommon("iconPicker.label")}
          description={tCommon("iconPicker.description")}
          styles={{
            description: { color: "var(--mantine-color-text)" },
            input: { color: "var(--mantine-color-text)" },
            error: { color: "light-dark(var(--mantine-color-red-9), var(--mantine-color-red-2))" },
          }}
          placeholder={placeholderText}
          autoComplete="off"
          spellCheck={false}
        />
      </Combobox.Target>

      <Combobox.Dropdown className={classes.dropdown}>
        <Combobox.Options className={classes.options} aria-label={tCommon("iconPicker.results")}>
          {directUrl ? (
            <Paper p="sm" m="xs" className={classes.urlPreview}>
              <Group wrap="nowrap" align="center">
                <Box className={classes.previewFrame}>
                  {previewState === "loading" && <Loader size={18} className={classes.previewLoader} />}
                  {previewState === "error" ? (
                    <ThemeIcon variant="light" color="red" size={40}>
                      <IconPhotoOff size={21} />
                    </ThemeIcon>
                  ) : (
                    <Image
                      src={directUrl}
                      alt=""
                      w={40}
                      h={40}
                      fit="contain"
                      data-testid="direct-url-preview"
                      onLoad={() => setPreviewState("ready")}
                      onError={() => setPreviewState("error")}
                    />
                  )}
                </Box>
                <Box flex={1} miw={0}>
                  <Text size="sm" fw={600}>
                    {previewState === "error"
                      ? tCommon("iconPicker.urlError")
                      : previewState === "ready"
                        ? tCommon("iconPicker.urlReady")
                        : tCommon("iconPicker.urlLoading")}
                  </Text>
                  <Text size="xs" truncate>
                    {directUrl}
                  </Text>
                </Box>
                {previewState === "ready" && (
                  <ThemeIcon variant="light" color="green" size="sm" aria-hidden>
                    <IconCheck size={14} />
                  </ThemeIcon>
                )}
              </Group>
            </Paper>
          ) : (
            renderSearchResults()
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

interface PickerSectionProps {
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
}

const PickerSection = ({ label, icon, badge, children }: PickerSectionProps) => (
  <Stack gap={6}>
    <Group gap={6} px={2}>
      {icon}
      <Text size="xs" fw={600}>
        {label}
      </Text>
      {badge && <span className={classes.sectionBadge}>{badge}</span>}
    </Group>
    {children}
  </Stack>
);

interface PickerMessageProps {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}

const PickerMessage = ({ icon, title, action }: PickerMessageProps) => (
  <Stack align="center" gap="xs" p="lg" ta="center">
    <ThemeIcon variant="light" color="gray" size="lg">
      {icon}
    </ThemeIcon>
    <Text size="sm">{title}</Text>
    {action}
  </Stack>
);

const localizationPathRegex = new RegExp(`^/?(${supportedLanguages.join("|")})(/.*)?$`, "i");
const shouldShowPreview = (value: string | null | undefined): value is string => {
  if (!value) return false;
  return !localizationPathRegex.test(value);
};
