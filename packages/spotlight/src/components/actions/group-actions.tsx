import { Center, Loader } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { SearchGroup } from "../../lib/group";
import type { inferSearchInteractionOptions } from "../../lib/interaction";
import type { SpotlightMode } from "../../open";
import { SpotlightGroupActionItem } from "./items/group-action-item";

interface GroupActionsProps<TOption extends Record<string, unknown>> {
  group: SearchGroup<TOption>;
  query: string;
  setQuery: (query: string) => void;
  setMode: (mode: SpotlightMode) => void;
  setChildrenOptions: (options: inferSearchInteractionOptions<"children">) => void;
}

export const SpotlightGroupActions = <TOption extends Record<string, unknown>>({
  group,
  query,
  setQuery,
  setMode,
  setChildrenOptions,
}: GroupActionsProps<TOption>) => {
  // This does work as the same amount of hooks is called on every render
  const useOptions =
    "options" in group ? () => group.options : "useOptions" in group ? group.useOptions : group.useQueryOptions;
  const options = useOptions(query);
  const t = useI18n();

  if (Array.isArray(options)) {
    if (options.length === 0) {
      return null;
    }

    const filteredOptions = options
      .filter((option) => ("filter" in group ? group.filter(query, option) : false))
      .sort((optionA, optionB) => {
        if ("sort" in group) {
          return group.sort?.(query, [optionA, optionB]) ?? 0;
        }

        return 0;
      });

    if (filteredOptions.length === 0) {
      return null;
    }

    return filteredOptions.map((option) => (
      <SpotlightGroupActionItem
        key={option[group.keyPath] as never}
        option={option}
        group={group}
        query={query}
        setQuery={setQuery}
        setMode={setMode}
        setChildrenOptions={setChildrenOptions}
      />
    ));
  }

  if (options.isLoading) {
    return (
      <Center w="100%" py="sm" data-search-loading>
        <Loader size="sm" />
      </Center>
    );
  }

  if (options.isError) {
    return (
      <Center py="sm" data-search-status>
        {t("search.error.fetch")}
      </Center>
    );
  }

  if (!options.data) {
    return null;
  }

  if (options.data.length === 0) {
    return null;
  }

  return options.data.map((option) => (
    <SpotlightGroupActionItem
      key={option[group.keyPath] as never}
      option={option}
      group={group}
      query={query}
      setQuery={setQuery}
      setMode={setMode}
      setChildrenOptions={setChildrenOptions}
    />
  ));
};
