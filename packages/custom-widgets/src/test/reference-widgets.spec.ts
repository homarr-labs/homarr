import { describe, expect, it } from "vitest";

import {
  BUNDLED_CUSTOM_WIDGETS,
  customWidgetAuthoringDefinitionSchema,
  customWidgetDefinitionSchema,
  normalizeCustomWidgetAuthoringDefinition,
  parseCustomWidgetAiResponse,
} from "../core";
import { getCustomWidgetExample, getCustomWidgetExampleCatalog } from "../core/authoring-resources";
import { collectCustomWidgetRequestReferences } from "../core/request-schema";
import { PORTAINER_REFERENCE_WIDGET } from "./fixtures/reference-widgets";

describe("reference widget capabilities", () => {
  const integrationPresetIds = [
    "dispatcharr-channels",
    "karakeep-bookmarks",
    "mealie-today",
    "romm-library",
    "tubearchivist-queue",
    "frigate-alerts",
    "frigate-system",
    "frigate-live-streams",
  ] as const;

  it("validates every bundled widget through the production definition schema", () => {
    expect(BUNDLED_CUSTOM_WIDGETS).toHaveLength(15);
    for (const { widget } of BUNDLED_CUSTOM_WIDGETS) {
      expect(() => customWidgetDefinitionSchema.parse(widget)).not.toThrow();
    }
  });

  it("exposes the requested integration presets to the assistant as installed examples", () => {
    expect(getCustomWidgetExampleCatalog().map(({ id }) => id)).toEqual(
      expect.arrayContaining([...integrationPresetIds]),
    );
    for (const id of integrationPresetIds) {
      expect(getCustomWidgetExample(id)?.widget.$schema).toBe("homarr-custom-widget-v2");
    }
  });

  it.each(integrationPresetIds)("round-trips %s through the production authoring schema", (id) => {
    const example = getCustomWidgetExample(id);
    if (!example) throw new Error(`Bundled example '${id}' was not found`);
    const { template, ...manifest } = example.widget;
    const normalized = normalizeCustomWidgetAuthoringDefinition(
      customWidgetAuthoringDefinitionSchema.parse({ ...manifest, templateLines: template.split("\n") }),
    );

    expect(normalized.template).toBe(template);
  });

  it("uses saved integrations for RomM and Frigate live-stream discovery", () => {
    expect(getCustomWidgetExample("romm-library")?.widget.sources.default).toMatchObject({
      type: "integration",
      integrationKind: "romm",
    });
    expect(getCustomWidgetExample("frigate-live-streams")?.widget).toMatchObject({
      sources: { default: { type: "integration", integrationKind: "frigate" } },
      requests: { streams: { path: "/api/go2rtc/streams" } },
    });
    const frigateLiveTemplate = getCustomWidgetExample("frigate-live-streams")?.widget.template ?? "";
    expect(frigateLiveTemplate).not.toContain("producer.url");
    expect(frigateLiveTemplate).not.toContain("producer.remote_addr");
  });

  it("validates a full Pokédex with list and manual detail requests", () => {
    const pokedex = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-pokedex");
    expect(pokedex).toBeDefined();
    const parsed = customWidgetDefinitionSchema.parse(pokedex?.widget);
    expect(parsed.requests.pokemon?.trigger).toBe("load");
    expect(parsed.requests.detail?.trigger).toBe("manual");
  });

  it("round-trips the full Pokédex through the single-block AI paste format", () => {
    const pokedex = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-pokedex")?.widget;
    if (!pokedex) throw new Error("Pokédex seed was not found");
    const parsed = parseCustomWidgetAiResponse(`\`\`\`json\n${JSON.stringify(pokedex, null, 2)}\n\`\`\``);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.widget.template).toBe(pokedex.template);
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
    const parsed = parseCustomWidgetAiResponse(
      `\`\`\`json\n${JSON.stringify(PORTAINER_REFERENCE_WIDGET, null, 2)}\n\`\`\``,
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.widget.template).toBe(PORTAINER_REFERENCE_WIDGET.template);
  });
});
