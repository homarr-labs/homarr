import { clientApi } from "@homarr/api/client";
import { useUserPreference } from "../../../../preferences/use-user-preference";
import { useScopedI18n } from "@homarr/translation/client";

import { createChildrenOptions } from "../../../../lib/children";
import { createLoadingPreferenceAction, PreferenceDetailHeader } from "./action-row";
import { createSelectablePreferenceActions } from "./selectable-actions";

export const searchEngineChildrenOptions = createChildrenOptions<Record<string, unknown>>({
  useActions: (_, query) => {
    const { value, setValue, isPending } = useUserPreference("defaultSearchEngineId");
    const currentValue = value as string | null;
    const searchEnginesQuery = clientApi.searchEngine.getSelectable.useQuery();
    const t = useScopedI18n("search.mode.command.group.preferences.option");

    if (searchEnginesQuery.isLoading) {
      return [createLoadingPreferenceAction()];
    }

    return createSelectablePreferenceActions({
      query,
      currentValue,
      noneLabel: t("searchEngine.none"),
      unavailableLabel: t("searchEngine.unavailable"),
      items: (searchEnginesQuery.data ?? []).map((engine) => ({
        key: engine.value,
        label: engine.label,
        value: engine.value,
      })),
      onSelect: (nextValue) => setValue(nextValue as never),
      isPending,
    });
  },
  DetailComponent: () => <PreferenceDetailHeader titleKey="defaultSearchEngineId.children.detail.title" />,
});
