import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  findCustomWidgetComponents,
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetComponents,
  getCustomWidgetContextRequestKey,
  getCustomWidgetExample,
  getCustomWidgetSharedProps,
  getCustomWidgetSkill,
  getCustomWidgetSkillContent,
  getCustomWidgetSkillEntrypoint,
  getCustomWidgetSkillReference,
} from "../core/authoring-resources";
import { validateCustomJsxTemplate } from "../jsx/analyzer";

const skillSourceDirectory = path.resolve(import.meta.dirname, "../../../../.agents/skills/homarr-custom-widget");

describe("authoring resources", () => {
  it("returns the complete portable skill and keeps every bundled source file in sync", () => {
    const skill = getCustomWidgetSkill();
    expect(skill).toMatchObject({ name: "homarr-custom-widget", version: "2.9.0" });
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
    expect(bundledContent).toContain("coordinated set of widgets");
    expect(bundledContent).toContain("customWidget_validateTemplate");
    expect(bundledContent).toContain("customWidget_findComponents");
    expect(bundledContent).toContain("Batch selected non-obvious binding or interaction documentation");
    expect(bundledContent).not.toContain("at most eight named component documents");
    expect(bundledContent).toContain("Do not use an unlabeled decorative icon as an empty state");
    expect(Buffer.byteLength(JSON.stringify(skill), "utf8")).toBeLessThan(12_000);

    const entrypoint = getCustomWidgetSkillEntrypoint();
    expect(entrypoint.references).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "runtime", tool: "customWidget_getReference" })]),
    );
    expect(JSON.stringify(entrypoint)).not.toContain("# Runtime");
    expect(entrypoint.skillMd).toContain("Context routing");
    expect(entrypoint.skillMd).toContain("customWidget_validateTemplate");
    expect(entrypoint.skillMd).toContain("customWidget_previewReviseTemplate");
    expect(entrypoint.skillMd).toContain("map every requested capability");
    expect(entrypoint.skillMd).toContain("purpose-specific visual signature");
    expect(entrypoint.skillMd).toContain("asymmetric priority metric/action");
    expect(entrypoint.skillMd).toContain("new manifest");
    expect(entrypoint.skillMd).not.toContain("To install an existing widget");
    expect(getCustomWidgetSkillReference("runtime").content).toContain("SubFetch");
    expect(getCustomWidgetSkillReference("runtime").content).toContain(
      'require `trigger: "manual"` on request and `SubFetch`',
    );
    expect(getCustomWidgetSkillReference("runtime").content).toContain("RefreshButton");
    expect(getCustomWidgetSkillReference("runtime").content).toContain("owns loading/error/retry");
    expect(getCustomWidgetSkillReference("runtime").content).toContain("need literal `requestId`");
    expect(getCustomWidgetSkillReference("runtime").content).toContain('requestId="search" label="Run again"');
    expect(getCustomWidgetSkillReference("runtime").content).toContain("Render load queries directly");
    expect(getCustomWidgetSkillReference("runtime").content).toContain("entire JSON response");
    expect(getCustomWidgetSkillReference("runtime").content).toContain("never map the envelope itself");
    expect(getCustomWidgetSkillReference("runtime").content).toContain("immediately hides its prior result");
    expect(getCustomWidgetSkillReference("runtime").content).toContain("Every stateful control must use `bind`");
    expect(getCustomWidgetSkillReference("runtime").content).toContain("resetKey={inputs.search}");
    expect(getCustomWidgetSkillReference("runtime").content).toContain('Date.toLocaleString(value, "en-US", "UTC")');
    expect(getCustomWidgetSkillReference("runtime").content).toContain("Never invent a formatter component");
    const schemaReference = getCustomWidgetSkillReference("schema").content;
    expect(schemaReference).toContain('"default": {');
    expect(schemaReference).toContain('"trigger": "manual"');
    expect(schemaReference).toContain('"kind": "action"');
    expect(schemaReference).toContain('"apiKeyHeader"');
    expect(schemaReference).toContain("is the required source ID");
    expect(Buffer.byteLength(schemaReference, "utf8")).toBeLessThan(4_000);
    expect(Buffer.byteLength(JSON.stringify(entrypoint), "utf8")).toBeLessThan(3_000);
    expect(Buffer.byteLength(JSON.stringify(entrypoint), "utf8")).toBeLessThan(
      Buffer.byteLength(JSON.stringify(skill), "utf8") / 3,
    );
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

  it("finds a focused component subset without sending the full catalog", () => {
    const result = findCustomWidgetComponents("TextInput SubFetch Image Card ActionButton", 12);
    const oversizedRequest = findCustomWidgetComponents("layout input action chart image status", 40);

    expect(result.components.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["TextInput", "SubFetch", "Image", "Card", "ActionButton"]),
    );
    expect(result.components).toHaveLength(12);
    expect(result.nextStep).toContain("customWidget_getComponent");
    expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThan(6_000);
    expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThan(
      Buffer.byteLength(JSON.stringify(getCustomWidgetComponentCatalog()), "utf8") / 5,
    );
    expect(oversizedRequest.components.length).toBeLessThanOrEqual(16);
  });

  it("batches selected component documentation without limiting the complete library", () => {
    const result = getCustomWidgetComponents([
      "SubFetch",
      "ActionButton",
      "TextInput",
      "Pagination",
      "SubFetch",
      "Missing",
    ]);

    expect(result.components.map(({ name }) => name)).toEqual(["SubFetch", "ActionButton", "TextInput", "Pagination"]);
    expect(result.components.find(({ name }) => name === "SubFetch")).toHaveProperty("props");
    expect(result.components.find(({ name }) => name === "TextInput")).toMatchObject({
      bind: { type: "string", initialProp: "defaultValue", resetProp: "resetKey" },
      propNames: expect.arrayContaining(["label", "description"]),
      fullDetailsTool: "customWidget_getComponent",
    });
    expect(result.components.find(({ name }) => name === "TextInput")).not.toHaveProperty("props");
    expect(result.notFound).toEqual(["Missing"]);
    expect(result.nextStep).toContain("template validation");
    expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThan(10_000);
  });

  it("identifies duplicate reloadable context requests independent of name order", () => {
    expect(getCustomWidgetContextRequestKey("customWidget_getReference", { name: "schema" })).toBe(
      'customWidget_getReference:{"name":"schema"}',
    );
    expect(getCustomWidgetContextRequestKey("customWidget_getComponents", { names: ["Text", "Badge", "Text"] })).toBe(
      getCustomWidgetContextRequestKey("customWidget_getComponents", { names: ["Badge", "Text"] }),
    );
    expect(getCustomWidgetContextRequestKey("customWidget_previewCreate", { definition: {} })).toBeNull();
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
