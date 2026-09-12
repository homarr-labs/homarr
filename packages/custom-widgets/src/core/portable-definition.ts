import type { HomarrCustomWidgetV2 } from "./custom-jsx-schema";

export function getCustomWidgetIntegrationOptionIds(widget: HomarrCustomWidgetV2) {
  const ids = new Set(
    Object.values(widget.extensions?.native ?? {}).flatMap((native) => {
      if (native.integrationOption) return [native.integrationOption];
      return [];
    }),
  );
  for (const [id, option] of Object.entries(widget.options)) {
    if (option.control === "integration") ids.add(id);
  }
  return ids;
}

/** Integration IDs identify local resources, so portable packages must not bind them. */
export function toPortableCustomWidgetDefinition(widget: HomarrCustomWidgetV2): HomarrCustomWidgetV2 {
  const integrationOptions = getCustomWidgetIntegrationOptionIds(widget);
  if (integrationOptions.size === 0) return widget;
  return {
    ...widget,
    options: Object.fromEntries(
      Object.entries(widget.options).map(([id, option]) => {
        if (!integrationOptions.has(id)) return [id, option];
        const { choices: _choices, choicesFrom: _choicesFrom, ...portable } = option;
        return [id, { ...portable, default: "" }];
      }),
    ),
  };
}
