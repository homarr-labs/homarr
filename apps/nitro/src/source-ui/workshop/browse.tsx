import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button, Group, Input, Loader, Pagination, Select, Stack, Tabs, TextInput, Title } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconExternalLink, IconSearch } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { WorkshopAccountButton } from "./account";

export interface WorkshopBrowseScreenProps {
  search: string;
  sort: "top" | "newest";
  page: number;
  totalPages?: number;
  fetching: boolean;
  accountName?: string;
  accountHold: string;
  workshopWebUrl?: string;
  onInstalledList?(): void;
  onFiltersChanged(filters: { search: string; sort: "top" | "newest"; page: number }): void;
  notice: ReactNode;
  children: ReactNode;
}

export function WorkshopBrowseScreen({
  search,
  sort,
  page,
  totalPages,
  fetching,
  accountName,
  accountHold,
  workshopWebUrl,
  onInstalledList,
  onFiltersChanged,
  notice,
  children,
}: WorkshopBrowseScreenProps) {
  const t = useI18n("workshop");
  const common = useI18n("common.action");
  const [draft, setDraft] = useState(search);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setDraft(search);
    setPending(false);
  }, [search]);
  const updateSearch = useDebouncedCallback((value: string) => {
    onFiltersChanged({ search: value.trim(), sort, page: 1 });
    setPending(false);
  }, 250);
  const clearSearch = () => {
    setDraft("");
    setPending(true);
    updateSearch("");
    updateSearch.flush();
  };
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={1}>{t("title")}</Title>
        <Group gap="xs" wrap="nowrap">
          <WorkshopAccountButton hold={accountHold} name={accountName} />
          {workshopWebUrl && (
            <Button
              component="a"
              href={workshopWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="default"
              leftSection={<IconExternalLink size={16} />}
              visibleFrom="sm"
            >
              {t("openCommunity")}
            </Button>
          )}
        </Group>
      </Group>
      <Stack gap="sm">
        <Tabs
          value="workshop"
          onChange={(value) => {
            if (value === "installed") onInstalledList?.();
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="installed" disabled={!onInstalledList}>
              Installed widgets
            </Tabs.Tab>
            <Tabs.Tab value="workshop">{t("title")}</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <Group gap="sm" align="flex-end" wrap="nowrap">
          <TextInput
            aria-label={t("search")}
            placeholder={`${t("search")}...`}
            leftSection={pending ? <Loader size="xs" /> : <IconSearch size={20} stroke={1.5} />}
            rightSection={
              draft ? <Input.ClearButton aria-label={common("clearSearch")} onClick={clearSearch} /> : undefined
            }
            rightSectionPointerEvents="all"
            value={draft}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft(value);
              setPending(true);
              updateSearch(value);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape" || !draft) return;
              event.preventDefault();
              clearSearch();
            }}
            style={{ flex: 1 }}
          />
          <Select<"top" | "newest">
            aria-label={t("sort")}
            value={sort}
            allowDeselect={false}
            w={160}
            data={[
              { value: "top", label: t("sortTop") },
              { value: "newest", label: t("sortNewest") },
            ]}
            onChange={(value) => {
              updateSearch.cancel();
              setPending(false);
              onFiltersChanged({ search: draft.trim(), sort: value ?? "top", page: 1 });
            }}
          />
        </Group>
      </Stack>
      {notice}
      {children}
      {totalPages !== undefined && totalPages > 1 && (
        <Pagination
          aria-label="Workshop pages"
          value={page}
          total={totalPages}
          onChange={(value) => onFiltersChanged({ search, sort, page: value })}
          disabled={fetching}
        />
      )}
    </Stack>
  );
}
