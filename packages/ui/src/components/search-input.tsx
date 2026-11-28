"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input, Loader, TextInput } from "@mantine/core";
import { useDebouncedCallback, useWindowEvent } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface SearchInputProps {
  defaultValue?: string;
  placeholder: string;
  ariaLabel: string;
  flexExpand?: boolean;
}

export const SearchInput = ({ placeholder, ariaLabel, defaultValue, flexExpand = false }: SearchInputProps) => {
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const t = useI18n("common.action");
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const pendingSearches = useRef<string[]>([]);
  const handleSearchDebounced = useDebouncedCallback((nextValue: string) => {
    const params = new URLSearchParams(searchParams);
    const normalizedValue = nextValue.trim();
    if (normalizedValue.length === 0) {
      params.delete("search");
    } else {
      params.set("search", normalizedValue);
    }
    if (params.has("page")) params.set("page", "1"); // Reset page to 1
    const query = params.toString();
    if (query !== searchParams.toString()) {
      pendingSearches.current.push(query);
    } else {
      pendingSearches.current = [];
    }
    router.replace(query ? `${pathName}?${query}` : pathName);
    setLoading(false);
  }, 250);

  useWindowEvent("popstate", () => {
    pendingSearches.current = [];
    handleSearchDebounced.cancel();
  });

  useEffect(() => {
    const pendingIndex = pendingSearches.current.indexOf(searchParams.toString());
    if (pendingIndex !== -1) {
      // A completed search must not replace newer typing or its untrimmed text.
      pendingSearches.current.splice(0, pendingIndex + 1);
      return;
    }

    pendingSearches.current = [];
    handleSearchDebounced.cancel();
    setValue(defaultValue ?? "");
    setLoading(false);
  }, [defaultValue, pathName, searchParams, handleSearchDebounced]);

  const handleSearch = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.currentTarget.value);
      setLoading(true);
      handleSearchDebounced(event.currentTarget.value);
    },
    [setLoading, handleSearchDebounced],
  );

  const clearSearch = useCallback(() => {
    setValue("");
    setLoading(true);
    handleSearchDebounced("");
    handleSearchDebounced.flush();
  }, [handleSearchDebounced]);

  return (
    <TextInput
      leftSection={<LeftSection loading={loading} />}
      rightSection={value ? <Input.ClearButton aria-label={t("clearSearch")} onClick={clearSearch} /> : undefined}
      rightSectionPointerEvents="all"
      value={value}
      onChange={handleSearch}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !value) return;

        event.preventDefault();
        clearSearch();
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={{ flex: flexExpand ? "1" : undefined }}
    />
  );
};

interface LeftSectionProps {
  loading: boolean;
}
const LeftSection = ({ loading }: LeftSectionProps) => {
  if (loading) {
    return <Loader size="xs" />;
  }

  return <IconSearch size={20} stroke={1.5} />;
};
