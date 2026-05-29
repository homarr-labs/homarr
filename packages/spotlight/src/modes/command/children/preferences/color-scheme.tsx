import type { ColorScheme } from "@homarr/definitions";
import { colorSchemes } from "@homarr/definitions";
import { useUserPreference } from "../../../../preferences/use-user-preference";
import { useScopedI18n } from "@homarr/translation/client";

import { createChildrenOptions } from "../../../../lib/children";
import { createCheckmarkPreferenceAction, PreferenceDetailHeader } from "./action-row";

export const colorSchemeChildrenOptions = createChildrenOptions<Record<string, unknown>>({
  useActions: () => {
    const tOptions = useScopedI18n("common.colorScheme.options");
    const { value, setValue, isPending } = useUserPreference("colorScheme");
    const currentValue = value as ColorScheme;

    return colorSchemes.map((scheme) =>
      createCheckmarkPreferenceAction({
        key: scheme,
        label: tOptions(scheme),
        isSelected: currentValue === scheme,
        onSelect: () => setValue(scheme as never),
        isPending,
      }),
    );
  },
  DetailComponent: () => <PreferenceDetailHeader titleKey="colorScheme.children.detail.title" />,
});
