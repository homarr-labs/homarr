import { Spotlight } from "@mantine/spotlight";

import { useI18n } from "@homarr/translation/client";

import type { SearchGroup } from "../../lib/group";
import type { inferSearchInteractionOptions } from "../../lib/interaction";
import { SpotlightGroupActionItem } from "./items/group-action-item";

interface GroupActionsProps<TOption extends Record<string, unknown>> {
  group: SearchGroup<TOption>;
  query: string;
  setMode: (mode: string) => void;
  setChildrenOptions: (options: inferSearchInteractionOptions<"children">) => void;
}

export const SpotlightGroupActions = <TOption extends Record<string, unknown>>({
  group,
  query,
  setMode,
  setChildrenOptions,
}: GroupActionsProps<TOption>) => {
  // This does work as the same amount of hooks is called on every render
  const useOptions =
    "options" in group ? () => group.options : "useOptions" in group ? group.useOptions : group.useQueryOptions;
  const options = useOptions(query);
  const t = useI18n();

  if (Array.isArray(options)) {
    const filteredOptions = options
      .filter((option) => ("filter" in group ? group.filter(query, option) : false))
      .sort((optionA, optionB) => {
        if ("sort" in group) {
          return group.sort?.(query, [optionA, optionB]) ?? 0;
        }

        return 0;
      });

    if (filteredOptions.length === 0) {
      return <Spotlight.Empty>{t("common.search.nothingFound")}</Spotlight.Empty>;
    }

    return filteredOptions.map((option) => (
      <SpotlightGroupActionItem
        key={option[group.keyPath] as never}
        option={option}
        group={group}
        query={query}
        setMode={setMode}
        setChildrenOptions={setChildrenOptions}
      />
    ));
  }

  if (options.isLoading || options.isError || !options.data) {
    return <></>;
  }

  if (options.data.length === 0) {
    return <Spotlight.Empty>{t("common.search.nothingFound")}</Spotlight.Empty>;
  }

  return options.data.map((option) => (
    <SpotlightGroupActionItem
      key={option[group.keyPath] as never}
      option={option}
      group={group}
      query={query}
      setMode={setMode}
      setChildrenOptions={setChildrenOptions}
    />
  ));
};
