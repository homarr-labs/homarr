"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { Input, Loader, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { useNavigation } from "../navigation";

interface SearchInputProps {
  defaultValue?: string;
  placeholder: string;
  ariaLabel: string;
  flexExpand?: boolean;
}

export const SearchInput = ({ placeholder, ariaLabel, defaultValue, flexExpand = false }: SearchInputProps) => {
  const navigation = useNavigation();
  const t = useI18n("common.action");
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  useEffect(() => {
    setValue(defaultValue ?? "");
    setLoading(false);
  }, [defaultValue]);
  const handleSearchDebounced = useDebouncedCallback((nextValue: string) => {
    const params = new URLSearchParams(navigation.search);
    const normalizedValue = nextValue.trim();
    if (normalizedValue.length === 0) {
      params.delete("search");
    } else {
      params.set("search", normalizedValue);
    }
    if (params.has("page")) params.set("page", "1");
    const query = params.toString();
    navigation.replace(query ? `${navigation.pathname}?${query}` : navigation.pathname);
    setLoading(false);
  }, 250);

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
