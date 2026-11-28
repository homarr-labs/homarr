"use client";

import type { ReactNode } from "react";
import { Anchor, Flex, isOptionsGroup, Pill } from "@mantine/core";
import type { ComboboxItem, ComboboxParsedItem, ComboboxRenderPillInput, OptionsFilter } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { matchesSmartHomeSearch, normalizeSmartHomeSearchText, tokenizeSmartHomeSearch } from "./catalog-index";
import type { SmartHomeCatalogState } from "./use-smart-home-catalog";

export interface SmartHomePickerBaseProps {
  catalog: SmartHomeCatalogState;
  label?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  error?: ReactNode;
  disabled?: boolean;
}

export const createSmartHomeOptionsFilter =
  (searchTextByValue: ReadonlyMap<string, string>): OptionsFilter =>
  ({ options, search, limit }) => {
    const tokens = tokenizeSmartHomeSearch(search);
    let remaining = limit;
    const keep = (item: ComboboxItem<string | number | boolean>) =>
      matchesSmartHomeSearch(
        searchTextByValue.get(String(item.value)) ?? normalizeSmartHomeSearchText(item.label),
        tokens,
      );
    const result: ComboboxParsedItem[] = [];

    for (const option of options) {
      if (remaining <= 0) break;
      if (isOptionsGroup(option)) {
        const items: ComboboxItem[] = [];
        for (const item of option.items) {
          if (remaining <= 0) break;
          if (!keep(item)) continue;
          items.push({ ...item, value: String(item.value) });
          remaining -= 1;
        }
        if (items.length > 0) result.push({ group: option.group, items });
        continue;
      }
      if (!keep(option)) continue;
      result.push(option);
      remaining -= 1;
    }

    return result;
  };

export const useSmartHomePickerStatus = (catalog: SmartHomeCatalogState, placeholder: string | undefined) => {
  const t = useI18n();

  switch (catalog.status) {
    case "idle":
      return {
        loading: false,
        unavailable: true,
        placeholder: t("widget.integrationSelect.configureIntegrationFirst"),
        statusError: undefined,
      };
    case "loading":
      return {
        loading: true,
        unavailable: true,
        placeholder: t("widget.common.select.loading"),
        statusError: undefined,
      };
    case "error":
      return {
        loading: false,
        unavailable: true,
        placeholder,
        statusError: (
          <Flex component="span" gap={6} align="center" wrap="wrap">
            {t("widget.common.select.loadError")}
            <Anchor component="button" type="button" size="xs" onClick={catalog.retry}>
              {t("common.action.tryAgain")}
            </Anchor>
          </Flex>
        ),
      };
    case "ready":
      return { loading: catalog.isRefreshing, unavailable: false, placeholder, statusError: undefined };
  }
};

export const SmartHomeMissingPill = ({ option, onRemove, disabled }: ComboboxRenderPillInput) => {
  const t = useI18n();
  const unavailable = t("widget.smartHome-entityState.state.unavailable");
  return (
    <Pill
      withRemoveButton={!disabled}
      onRemove={onRemove}
      disabled={disabled}
      c="orange"
      title={`${option.label} · ${unavailable}`}
      aria-label={`${option.label} (${unavailable})`}
    >
      <Flex component="span" gap={4} align="center" wrap="nowrap">
        <IconAlertTriangle size={12} stroke={2} aria-hidden />
        {option.label}
      </Flex>
    </Pill>
  );
};

export const SmartHomeKnownPill = ({ option, onRemove, disabled }: ComboboxRenderPillInput) => (
  <Pill withRemoveButton={!disabled} onRemove={onRemove} disabled={disabled}>
    {option.label}
  </Pill>
);
