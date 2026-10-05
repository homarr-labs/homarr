import { createGroup } from "../../lib/group";
import type { ChildrenAction } from "../../lib/children";
import { useSettingsActions } from "../command/children/preferences/settings-children";

type PreferenceAction = ChildrenAction<Record<string, unknown>>;

/** Preferences are normal command-menu actions, not a gateway into another hidden list. */
export const preferencesGroup = createGroup<PreferenceAction>({
  keyPath: "key",
  title: (t) => t("search.mode.command.group.preferences.title"),
  source: { kind: "local" },
  useOptions(query) {
    return useSettingsActions({}, query);
  },
  Component(option) {
    return <option.Component />;
  },
  useInteraction(option, query) {
    return option.useInteraction({}, query);
  },
  filter: () => true,
});
