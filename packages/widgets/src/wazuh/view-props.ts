import type { WidgetComponentProps } from "../definition";

/** Every tab renders with the props of the combined widget, so options are shared across tabs. */
export type WazuhViewProps = Pick<
  WidgetComponentProps<"wazuh">,
  "integrationIds" | "options" | "width" | "height" | "isEditMode" | "boardId" | "itemId" | "setOptions"
>;
