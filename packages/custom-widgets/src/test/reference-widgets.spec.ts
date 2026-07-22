import { describe, expect, it } from "vitest";

import { BUNDLED_CUSTOM_WIDGETS, customWidgetDefinitionSchema, parseCustomWidgetAiResponse } from "../core";
import { collectCustomWidgetRequestReferences } from "../core/request-schema";
import { PORTAINER_REFERENCE_WIDGET } from "./fixtures/reference-widgets";

describe("reference widget capabilities", () => {
  it("validates a full Pokédex with list and manual detail requests", () => {
    const pokedex = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-pokedex");
    expect(pokedex).toBeDefined();
    const parsed = customWidgetDefinitionSchema.parse(pokedex?.widget);
    expect(parsed.requests.pokemon?.trigger).toBe("load");
    expect(parsed.requests.detail?.trigger).toBe("manual");
  });

  it("round-trips the full Pokédex through the exact two-block AI paste format", () => {
    const pokedex = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-pokedex")?.widget;
    if (!pokedex) throw new Error("Pokédex seed was not found");
    const { template, ...manifest } = pokedex;
    const parsed = parseCustomWidgetAiResponse(
      `\`\`\`json\n${JSON.stringify({ ...manifest, template: "__HOMARR_TEMPLATE__" }, null, 2)}\n\`\`\`\n\n\`\`\`jsx\n${template}\n\`\`\``,
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.widget.template).toBe(template);
  });

  it("validates a polished Portainer dashboard with start, stop, and restart actions", () => {
    const parsed = customWidgetDefinitionSchema.parse(PORTAINER_REFERENCE_WIDGET);
    expect(parsed.sources.default?.auth).toEqual({ type: "apiKeyHeader", name: "X-API-Key" });
    expect(Object.keys(parsed.requests)).toEqual(["containers", "start", "stop", "restart"]);
    for (const action of ["start", "stop", "restart"] as const) {
      const request = parsed.requests[action];
      if (!request) throw new Error(`Portainer ${action} request was not found`);
      expect(request.kind).toBe("action");
      expect(request.invalidates).toEqual(["containers"]);
      expect([...collectCustomWidgetRequestReferences(request).params]).toEqual(["id"]);
    }
  });

  it("round-trips the Portainer dashboard through AI paste", () => {
    const { template, ...manifest } = PORTAINER_REFERENCE_WIDGET;
    const parsed = parseCustomWidgetAiResponse(
      `\`\`\`json\n${JSON.stringify({ ...manifest, template: "__HOMARR_TEMPLATE__" }, null, 2)}\n\`\`\`\n\n\`\`\`jsx\n${template}\n\`\`\``,
    );
    expect(parsed.success).toBe(true);
  });
});
