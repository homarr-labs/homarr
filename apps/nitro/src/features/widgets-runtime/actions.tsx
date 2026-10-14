import { Menu } from "@mantine/core";

import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { WidgetContextActionProps, WidgetDefinition } from "@homarr/widgets/definition";

export function NativeWidgetContextActionItems({
  definition,
  ...props
}: WidgetContextActionProps & {
  definition: WidgetDefinition;
}) {
  const t = useI18n();
  const actions = definition.contextActions?.(props).filter((action) => !action.hidden) ?? [];
  return actions.map((action) => {
    const Icon = action.icon;
    return (
      <Menu.Item
        key={action.key}
        closeMenuOnClick
        leftSection={Icon ? <Icon size={16} /> : undefined}
        onClick={action.onClick}
        disabled={action.disabled}
        color={action.color}
      >
        {translateIfNecessary(t, action.label)}
      </Menu.Item>
    );
  });
}
