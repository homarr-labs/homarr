import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrNotebookDefinition
  extends CommonOldmarrWidgetDefinition<
    "notebook",
    {
      showToolbar: boolean;
      allowReadOnlyCheck: boolean;
      content: string;
    }
  > {}
