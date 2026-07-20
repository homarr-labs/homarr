import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  GENERATED_COMPONENT_REFERENCE_PATHS,
  getComponentReferenceAnchor,
  renderCustomWidgetComponentReferences,
} from "../../scripts/component-docs";
import { customJsxAuthoringCatalog } from "../core/component-catalog";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const skillReferenceRoot = resolve(repositoryRoot, ".agents/skills/homarr-custom-widget/references");

describe("generated Custom Widget component references", () => {
  test("match the canonical static catalog byte for byte", async () => {
    const generated = renderCustomWidgetComponentReferences(customJsxAuthoringCatalog);
    const checkedIn = Object.fromEntries(
      await Promise.all(
        GENERATED_COMPONENT_REFERENCE_PATHS.map(async (path) => [
          path,
          await readFile(resolve(skillReferenceRoot, path), "utf8"),
        ]),
      ),
    );

    expect(checkedIn).toEqual(generated);
  });

  test("documents catalog versions and the complete component inventory", () => {
    const generated = renderCustomWidgetComponentReferences(customJsxAuthoringCatalog);
    const combined = GENERATED_COMPONENT_REFERENCE_PATHS.map((path) => generated[path]).join("\n");

    expect(generated["components.md"]).toContain(`Catalog schema v${customJsxAuthoringCatalog.schemaVersion}`);
    expect(generated["components.md"]).toContain(`Custom Widget ${customJsxAuthoringCatalog.customWidgetVersion}`);
    expect(generated["components.md"]).toContain(`Mantine ${customJsxAuthoringCatalog.mantineVersion}`);

    for (const component of customJsxAuthoringCatalog.components)
      expect(combined, component.name).toContain(component.name);
  });

  test("keeps detailed records only for Homarr-owned runtime components", () => {
    const generated = renderCustomWidgetComponentReferences(customJsxAuthoringCatalog);
    const homarrComponents = customJsxAuthoringCatalog.components.filter(
      (component) => component.package === "@homarr/widgets",
    );
    for (const component of homarrComponents) {
      const reference = generated["homarr-components.md"];
      expect(reference).toContain(`<a id="${getComponentReferenceAnchor(component.name)}"></a>`);
      expect(reference).toContain(`### \`${component.name}\``);
      for (const prop of component.props) {
        expect(reference).toContain(`<code>${prop.name}</code>`);
        expect(reference).toContain(`<code>${escapeHtml(customJsxAuthoringCatalog.types[prop.typeRef] ?? "")}</code>`);
      }
    }
  });

  test("keeps schema, runtime, and security references human-authored", () => {
    expect(GENERATED_COMPONENT_REFERENCE_PATHS).not.toContain("schema.md");
    expect(GENERATED_COMPONENT_REFERENCE_PATHS).not.toContain("runtime.md");
    expect(GENERATED_COMPONENT_REFERENCE_PATHS).not.toContain("security.md");
    expect(GENERATED_COMPONENT_REFERENCE_PATHS).not.toContain("mantine-core.md");
    expect(GENERATED_COMPONENT_REFERENCE_PATHS).not.toContain("mantine-dates.md");
    expect(GENERATED_COMPONENT_REFERENCE_PATHS).not.toContain("mantine-charts.md");
  });
});

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("|", "&#124;");
}
