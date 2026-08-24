import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetExample,
  getCustomWidgetSharedProps,
  getCustomWidgetSkill,
  getCustomWidgetSkillContent,
} from "../core/authoring-resources";
import { validateCustomJsxTemplate } from "../jsx/analyzer";

const skillSourceDirectory = path.resolve(import.meta.dirname, "../../../../.agents/skills/homarr-custom-widget");

describe("authoring resources", () => {
  it("returns the complete portable skill and keeps every bundled source file in sync", () => {
    const skill = getCustomWidgetSkill();
    expect(skill).toMatchObject({ name: "homarr-custom-widget", version: "2.3.0" });
    expect(skill.skillsShUrl).toContain("skills.sh/homarr-labs/homarr");
    expect(skill.sourceUrl).toContain("/tree/HEAD/.agents/skills/homarr-custom-widget");
    expect(skill.installCommand).toContain("--skill homarr-custom-widget");
    expect(skill).not.toHaveProperty("componentCatalog");
    expect(skill).not.toHaveProperty("entrypointMd");
    expect(skill).not.toHaveProperty("bundledMarkdown");
    expect(skill.skillMd.trim()).toBe(readFileSync(path.join(skillSourceDirectory, "SKILL.md"), "utf8").trim());
    const bundledContent = getCustomWidgetSkillContent();
    for (const [file, content] of Object.entries(skill.references)) {
      expect(content.trim()).toBe(readFileSync(path.join(skillSourceDirectory, file), "utf8").trim());
      expect(bundledContent).toContain(`# Bundled file: ${file}`);
      expect(bundledContent).toContain(content.trim());
    }
    expect(bundledContent).toContain(skill.skillMd.trim());
    expect(bundledContent).toContain("at most eight named component documents");
    expect(bundledContent).toContain("at most four after loading a complete example");
    expect(bundledContent).toContain("successful preview response as the binding contract");
    expect(bundledContent).toContain("Do not use an unlabeled decorative icon as an empty state");
    expect(Buffer.byteLength(JSON.stringify(skill), "utf8")).toBeLessThan(12_000);
  });

  it("keeps catalog discovery compact and component details lazy", () => {
    const catalog = getCustomWidgetComponentCatalog();
    expect(catalog.components.length).toBeGreaterThan(100);
    expect(catalog.components).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Stack", category: expect.any(String) })]),
    );
    expect(catalog.examples).toEqual(expect.arrayContaining([expect.objectContaining({ id: "service-dashboard" })]));
    expect(catalog.examples).toEqual(expect.arrayContaining([expect.objectContaining({ id: "pokedex" })]));
    const pokedex = getCustomWidgetExample("pokedex");
    expect(pokedex).toMatchObject({
      id: "pokedex",
      widget: {
        $schema: "homarr-custom-widget-v2",
        name: "Pokédex",
        sources: { default: { baseUrl: "https://pokeapi.co" } },
      },
    });
    const serviceDashboard = getCustomWidgetExample("service-dashboard");
    if (!serviceDashboard) throw new Error("Service dashboard example is missing");
    expect(validateCustomJsxTemplate(serviceDashboard.widget.template)).toEqual([]);
    expect(serviceDashboard.widget.template.match(/<Paper/gu)).toHaveLength(1);
    expect(serviceDashboard.widget.template).toContain('RefreshButton label="Refresh service health"');
    expect(Buffer.byteLength(JSON.stringify(pokedex), "utf8")).toBeLessThan(16_000);
    expect(catalog.sharedProps).toMatchObject({
      count: expect.any(Number),
      fetchTool: "customWidget_getSharedProps",
      maxPerRequest: 64,
    });
    expect(catalog.sharedProps.names).toContain("p");
    expect(Buffer.byteLength(JSON.stringify(catalog), "utf8")).toBeLessThan(45_000);

    const stack = getCustomWidgetComponent("Stack");
    expect(stack).toMatchObject({
      name: "Stack",
      sharedProps: { fetchTool: "customWidget_getSharedProps" },
    });
    expect(stack?.props.some(({ source }) => source === "global")).toBe(false);
    expect(Buffer.byteLength(JSON.stringify(stack), "utf8")).toBeLessThan(20_000);
    expect(getCustomWidgetComponent("Icon")?.knownValues?.name.length).toBeGreaterThan(100);

    const largestComponentPayload = Math.max(
      ...catalog.components.map(({ name }) =>
        Buffer.byteLength(JSON.stringify(getCustomWidgetComponent(name)), "utf8"),
      ),
    );
    expect(largestComponentPayload).toBeLessThan(20_000);
  });

  it("returns only requested shared prop documentation in one bounded payload", () => {
    const result = getCustomWidgetSharedProps(["p", "m", "not-a-shared-prop", "p"]);
    expect(result.props.map(({ name }) => name)).toEqual(["p", "m"]);
    expect(result.notFound).toEqual(["not-a-shared-prop"]);
    expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThan(4_000);

    const boundedBatch = getCustomWidgetSharedProps(getCustomWidgetComponentCatalog().sharedProps.names.slice(0, 64));
    expect(Buffer.byteLength(JSON.stringify(boundedBatch), "utf8")).toBeLessThan(15_000);
  });
});
