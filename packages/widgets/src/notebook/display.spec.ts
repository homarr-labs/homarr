import { describe, expect, test } from "vitest";

import { getNotebookDisplay } from "./display";

describe("Notebook advanced disclosure", () => {
  test("shows the complete toolbar and document stats regardless of compact preferences", () => {
    expect(
      getNotebookDisplay({ height: 100, isAdvanced: true, isEditing: true, isSaving: false, showToolbar: false }),
    ).toEqual({ showToolbar: true, toolbarMaxHeight: undefined, showDocumentStats: true });
  });

  test("does not expose editing controls outside an active editable session", () => {
    expect(
      getNotebookDisplay({ height: 300, isAdvanced: true, isEditing: false, isSaving: false, showToolbar: true })
        .showToolbar,
    ).toBe(false);
  });
});
