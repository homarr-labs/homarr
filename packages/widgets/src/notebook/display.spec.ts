import { describe, expect, test } from "vitest";

import { getNotebookDisplay } from "./display";

describe("Notebook advanced disclosure", () => {
  test("does not expose editing controls outside an active editable session", () => {
    expect(
      getNotebookDisplay({ height: 300, isAdvanced: true, isEditing: false, isSaving: false, showToolbar: true })
        .showToolbar,
    ).toBe(false);
  });
});
