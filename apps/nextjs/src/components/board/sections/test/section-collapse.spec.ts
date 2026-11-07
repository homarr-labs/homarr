import { describe, expect, test } from "vitest";

import { getVisuallyCollapsedSectionIds } from "../section-collapse";

const ids = (...values: string[]) => new Set(values);

const collapsed = (input: Partial<Parameters<typeof getVisuallyCollapsedSectionIds>[0]>) => [
  ...getVisuallyCollapsedSectionIds({
    collapsedSectionIds: ids(),
    idleCollapsedSectionIds: ids(),
    autoExpandedSectionIds: ids(),
    temporarilyExpandedIds: ids(),
    isEditMode: false,
    ...input,
  }),
];

describe("getVisuallyCollapsedSectionIds", () => {
  test("collapses an idle watched container even when it was saved expanded", () => {
    expect(collapsed({ idleCollapsedSectionIds: ids("media") })).toEqual(["media"]);
  });

  test("expands a saved-collapsed container while its watched widget is active", () => {
    expect(collapsed({ collapsedSectionIds: ids("media"), autoExpandedSectionIds: ids("media") })).toEqual([]);
  });

  test("keeps containers without auto-expand on their saved state", () => {
    expect(collapsed({ collapsedSectionIds: ids("apps") })).toEqual(["apps"]);
  });

  test("expands a container opened for editing only in edit mode", () => {
    const input = { idleCollapsedSectionIds: ids("media"), temporarilyExpandedIds: ids("media") };
    expect(collapsed({ ...input, isEditMode: true })).toEqual([]);
    expect(collapsed(input)).toEqual(["media"]);
  });
});
