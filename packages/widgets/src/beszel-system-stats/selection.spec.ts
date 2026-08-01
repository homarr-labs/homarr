import { describe, expect, it } from "vitest";

import { createBeszelSystemChoices, resolveBeszelSystemChoice } from "./selection";

const choices = createBeszelSystemChoices([
  { integrationId: "one", integrationName: "Primary", systems: [{ id: "same", name: "Host A" }] },
  { integrationId: "two", integrationName: "Backup", systems: [{ id: "same", name: "Host B" }] },
]);

describe("Beszel system selection", () => {
  it("uses a composite integration and system identity", () => {
    expect(choices.map((choice) => choice.value)).toEqual(["one:same", "two:same"]);
    expect(resolveBeszelSystemChoice(choices, "two:same")?.integrationId).toBe("two");
  });

  it("keeps legacy plain system ids working", () => {
    expect(resolveBeszelSystemChoice(choices, "same")?.integrationId).toBe("one");
  });
});
