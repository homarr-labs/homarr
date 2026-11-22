import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Button,
  Input,
  Popover,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import { customJsxTablerIconNames } from "@homarr/custom-widgets/tabler-icons";
import { useI18n } from "@homarr/translation/client";

import { SpriteIcon, spriteBasePath } from "./sprite-icon";

/** Categories and search tags per icon, written next to the sprite by apps/nextjs/scripts/prepare-tabler-icons.mjs. */
interface IconMeta {
  categories: string[];
  icons: Record<string, [category: number, tags: string]>;
}

// Loaded once, the first time a picker opens; without it the picker still searches by name.
let iconMetaRequest: Promise<IconMeta | null> | null = null;
const loadIconMeta = () =>
  (iconMetaRequest ??= fetch(`${spriteBasePath}/meta.json`)
    .then((response) => (response.ok ? (response.json() as Promise<IconMeta>) : null))
    .catch(() => null));

const FILLED_SUFFIX = "-filled";
// A filled icon shares its outline twin's category and tags.
const baseName = (name: string) => (name.endsWith(FILLED_SUFFIX) ? name.slice(0, -FILLED_SUFFIX.length) : name);

// Icons are drawn in pages while scrolling, so opening the picker never renders thousands of icons at once.
const PAGE_SIZE = 96;

interface TablerIconPickerProps {
  value: string | undefined;
  onChange: (icon: string | undefined) => void;
  label: string;
  /** Text of the button that clears the choice, telling what is shown then (for example "Use the entity's icon"). */
  resetLabel: string;
  /** Icons offered first, before any search; names the installed set does not have are left out. */
  suggestions?: readonly string[];
}

/**
 * Picks any Tabler icon by name: searchable by name and tags, filterable by category, drawn page by page from the
 * shared icon sprite. Empty means no icon was chosen, so the caller's default applies.
 */
export function TablerIconPicker({ value, onChange, label, resetLabel, suggestions = [] }: TablerIconPickerProps) {
  const t = useI18n("common.tablerIconPicker");
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [meta, setMeta] = useState<IconMeta | null>(null);
  useEffect(() => {
    if (opened && !meta) void loadIconMeta().then(setMeta);
  }, [opened, meta]);
  const search = useDeferredValue(query.trim().toLowerCase());
  // Every icon of the set, narrowed by category and search. A search matches the name or the icon's tags, every word
  // somewhere ("lamp" also finds "bulb"). Without either, the suggestions come first.
  const results = useMemo(() => {
    const words = search.split(/\s+/).filter(Boolean);
    const categoryIndex = category && meta ? meta.categories.indexOf(category) : -1;
    const matches = (name: string) => {
      const info = meta?.icons[baseName(name)];
      if (categoryIndex >= 0 && info?.[0] !== categoryIndex) return false;
      return words.every((word) => name.includes(word) || (info?.[1].includes(word) ?? false));
    };
    const filtered = customJsxTablerIconNames.filter(matches);
    if (words.length > 0 || categoryIndex >= 0) return filtered;
    const known = new Set(filtered);
    const suggested = suggestions.filter((name) => known.has(name));
    const first = new Set(suggested);
    return [...suggested, ...filtered.filter((name) => !first.has(name))];
  }, [search, category, meta, suggestions]);
  // How many are drawn; a new search or category starts again at the first page.
  const pagingKey = `${search}|${category ?? ""}`;
  const [paging, setPaging] = useState({ key: pagingKey, count: PAGE_SIZE });
  const shownCount = paging.key === pagingKey ? paging.count : PAGE_SIZE;
  const shown = results.slice(0, shownCount);
  const viewport = useRef<HTMLDivElement>(null);
  const loadMoreNearEnd = () => {
    const element = viewport.current;
    if (!element || shownCount >= results.length) return;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 120) {
      setPaging({ key: pagingKey, count: shownCount + PAGE_SIZE });
    }
  };

  const pick = (icon: string | undefined) => {
    onChange(icon);
    setOpened(false);
    setQuery("");
  };

  return (
    <Input.Wrapper label={label}>
      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom-start"
        width={344}
        shadow="md"
        trapFocus
        returnFocus
      >
        <Popover.Target>
          <ActionIcon
            variant="default"
            size="input-sm"
            onClick={() => setOpened((open) => !open)}
            aria-label={value ? t("chosen", { name: value }) : label}
            title={value ?? t("auto")}
            display="flex"
          >
            {value ? (
              <SpriteIcon name={value} size={18} />
            ) : (
              <Text size="xs" c="dimmed">
                {t("auto")}
              </Text>
            )}
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="xs">
            <TextInput
              size="xs"
              data-autofocus
              leftSection={<IconSearch size={14} />}
              placeholder={t("search")}
              // How many icons the search and category leave, right where they are narrowed down.
              rightSection={
                <Text size="xs" c="dimmed" pr={8} style={{ whiteSpace: "nowrap" }}>
                  {t("count", { count: results.length })}
                </Text>
              }
              rightSectionWidth="auto"
              rightSectionPointerEvents="none"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            <Select
              size="xs"
              aria-label={t("category")}
              placeholder={t("allCategories")}
              data={meta?.categories ?? []}
              value={category}
              onChange={setCategory}
              disabled={!meta}
              searchable
              clearable
              comboboxProps={{ withinPortal: false }}
            />
            <ScrollArea.Autosize mah={280} type="auto" viewportRef={viewport} onScrollPositionChange={loadMoreNearEnd}>
              {results.length > 0 ? (
                <SimpleGrid cols={8} spacing={4} verticalSpacing={4}>
                  {shown.map((name) => (
                    <ActionIcon
                      key={name}
                      variant={name === value ? "filled" : "subtle"}
                      color={name === value ? undefined : "gray"}
                      size="lg"
                      title={name}
                      aria-label={name}
                      onClick={() => pick(name)}
                    >
                      <SpriteIcon name={name} size={20} />
                    </ActionIcon>
                  ))}
                </SimpleGrid>
              ) : (
                <Text size="xs" c="dimmed" ta="center" py="sm">
                  {t("none")}
                </Text>
              )}
            </ScrollArea.Autosize>
            {value && (
              <Button size="xs" variant="subtle" onClick={() => pick(undefined)}>
                {resetLabel}
              </Button>
            )}
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Input.Wrapper>
  );
}
