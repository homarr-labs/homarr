import { describe, expect, it } from "vitest";

import { createBeszelSystemChoices, resolveBeszelSystemChoice, resolveStoredBeszelQuerySelection } from "./selection";

const choices = createBeszelSystemChoices([
  { integrationId: "one", integrationName: "Primary", systems: [{ id: "same", name: "Host A" }] },
  { integrationId: "two", integrationName: "Backup", systems: [{ id: "same", name: "Host B" }] },
]);

describe("Beszel system selection", () => {
  it("uses a composite integration and system identity", () => {
    expect(choices.map((choice) => choice.value)).toEqual(["one:same", "two:same"]);
    expect(resolveBeszelSystemChoice(choices, "two:same")?.integrationId).toBe("two");
  });

  it("keeps unique legacy plain system ids working", () => {
    expect(resolveBeszelSystemChoice(choices.slice(0, 1), "same")?.integrationId).toBe("one");
  });

  it("defaults an empty selection to the first system", () => {
    expect(resolveBeszelSystemChoice(choices, "")?.integrationId).toBe("one");
  });

  it("does not guess when a legacy plain system id is ambiguous", () => {
    expect(resolveBeszelSystemChoice(choices, "same")).toBeUndefined();
  });

  it("does not silently replace an unresolved stored system", () => {
    expect(resolveBeszelSystemChoice(choices, "missing")).toBeUndefined();
  });

  it("derives the queried integration and system from a composite selection", () => {
    expect(resolveStoredBeszelQuerySelection("two:same", ["one", "two"])).toEqual({
      integrationIds: ["two"],
      systemId: "same",
    });
  });

  it("supports a legacy plain system id only when the integration is unambiguous", () => {
    expect(resolveStoredBeszelQuerySelection("same", ["one"])).toEqual({
      integrationIds: ["one"],
      systemId: "same",
    });
    expect(resolveStoredBeszelQuerySelection("same", ["one", "two"])).toBeNull();
  });
});
