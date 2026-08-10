import { describe, expect, it, vi } from "vitest";

import {
  getPrivateWorkshopSourceNames,
  publishWorkshopDefinition,
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

  it("publishes readable multi-line JSON", () => {
    const serialized = serializeWorkshopDefinition(definition);
    expect(serialized).toContain('\n  "name": "Status"');
    expect(JSON.parse(serialized)).toEqual(definition);
  });

  it("blocks publishing when the definition changes after inspection", async () => {
    const publish = vi.fn(async () => undefined);
    await expect(
      publishWorkshopDefinition({
        inspectedDefinition: definition,
        refetchDefinition: async () => ({ ...definition, name: "Updated" }),
        publish,
      }),
    ).resolves.toBe("changed");
    expect(publish).not.toHaveBeenCalled();
  });

  it("publishes the same refreshed export that passed the change check", async () => {
    const publish = vi.fn(async () => undefined);
    await expect(
      publishWorkshopDefinition({
        inspectedDefinition: definition,
        refetchDefinition: async () => definition,
        publish,
      }),
    ).resolves.toBe("published");
    expect(publish).toHaveBeenCalledWith(serializeWorkshopDefinition(definition));
  });
});
