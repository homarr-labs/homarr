import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  getPrivateWorkshopSourceNames,
  serializeWorkshopDefinition,
  workshopDefinitionChanged,
} from "./workshop-publish-definition";

const definition = {
  name: "Status",
  sources: {
    public: { name: "Public API", networkScope: "public" },
    private: { name: "Home server", networkScope: "private" },
    local: { networkScope: "loopback" },
  },
};

describe("Workshop publish definition inspection", () => {
  it("reports every source URL that requires review", () => {
    expect(getPrivateWorkshopSourceNames(definition)).toEqual(["Home server", "local"]);
  });

  it("detects an export that changed after inspection", () => {
    expect(workshopDefinitionChanged(definition, definition)).toBe(false);
    expect(workshopDefinitionChanged(definition, { ...definition, name: "Updated" })).toBe(true);
  });

  it("submits the same refreshed export that passed the change check", () => {
    const source = readFileSync(
      `${process.cwd()}/apps/nextjs/src/components/workshop/workshop-publish-modal.tsx`,
      "utf8",
    );
    expect(source).toContain("customWidget.export.useQuery");
    expect(source).toContain("await definition.refetch()");
    expect(source).toContain("workshopDefinitionChanged(inspectedDefinition, refreshed.data)");
    expect(source).toContain("content: serializeWorkshopDefinition(refreshed.data)");
    expect(source).toMatch(/disabled=\{[\s\S]*!definition\.data[\s\S]*definition\.isError/u);
    expect(serializeWorkshopDefinition(definition)).toBe(JSON.stringify(definition));
  });
});
