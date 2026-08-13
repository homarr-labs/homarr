import { describe, expect, test } from "vitest";

import { getModalPresentationClassNames } from "./modal-presentation";

describe("getModalPresentationClassNames", () => {
  const inspectorClassNames = { inner: "inspector-inner", content: "inspector-content" };

  test("leaves the default modal presentation unchanged", () => {
    expect(getModalPresentationClassNames("default", inspectorClassNames)).toBeUndefined();
    expect(getModalPresentationClassNames(undefined, inspectorClassNames)).toBeUndefined();
  });

  test("selects the dock and sheet selectors for inspector modals", () => {
    expect(getModalPresentationClassNames("inspector", inspectorClassNames)).toEqual({
      inner: "inspector-inner",
      content: "inspector-content",
    });
  });
});
