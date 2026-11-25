import { WidgetDefinition } from "@site/src/types";
import { IconBinaryTree } from "@tabler/icons-react";

export const smartHomeEntityStateWidget: WidgetDefinition = {
  icon: IconBinaryTree,
  name: "Entity State",
  description: "Display the state of an entity and toggle it optionally",
  path: "../../widgets/smart-home-entity-state",
  configuration: {
    items: [
      {
        name: "Entity ID",
        description: "An entity from the selected Home Assistant or Homey integration, chosen from a searchable list.",
        values: { type: "string" },
        defaultValue: "",
      },
      {
        name: "Display Name",
        description: "Optional display name. Defaults to the entity's name, or its ID if no name is available.",
        values: { type: "string" },
        defaultValue: "",
      },
      {
        name: "Entity unit",
        description: "Optional unit for the entity (will be displayed after the value).",
        values: { type: "string" },
        defaultValue: "",
      },
      {
        name: "Clickable",
        description: "If enabled, the entity will be clickable and will toggle the state of the entity.",
        values: { type: "boolean" },
        defaultValue: "no",
      },
    ],
  },
};
