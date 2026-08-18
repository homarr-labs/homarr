import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

describe("legacy custom widget migration UI", () => {
  it("keeps legacy definitions visible and exposes the redacted LLM workflow", () => {
    const list = readSource("apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-list.tsx");
    const actions = readSource("apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-actions.tsx");

    expect(list).toContain("widget.migrationRequired");
    expect(list).toContain('t("page.list.migrationInstructions")');
    expect(actions).toContain("legacyMigrationPrompt.fetch");
    expect(actions).toContain("navigator.clipboard.writeText(result.prompt)");
    expect(actions).toContain("navigator.clipboard.readText()");
    expect(actions).toContain('t("action.pasteMigration")');
    expect(actions).toContain("parseCustomWidgetClipboardDetailed");
    expect(actions).toContain("legacyId={widget.id}");
  });

  it("replaces the legacy record through migration and refreshes every consumer", () => {
    // The import pipeline is shared by the dialog and the Workshop install page.
    const importer = readSource("apps/nextjs/src/components/custom-widgets/use-custom-widget-import.ts");
    const dialog = readSource("apps/nextjs/src/components/custom-widgets/custom-widget-import-dialog.tsx");

    expect(importer).toContain("customWidget.migrateLegacy.useMutation");
    expect(importer).toMatch(
      /migrateMutation\.mutate\(\{\s*id: legacyId,\s*widget: configuredWidget,\s*secrets,?\s*\}\)/u,
    );
    expect(importer).toContain("utils.customWidget.list.invalidate()");
    expect(importer).toContain("utils.customWidget.available.invalidate()");
    expect(importer).toContain("utils.widget.customApi.getData.invalidate()");
    expect(dialog).toContain("useCustomWidgetImport({");
    expect(dialog).toContain("legacyId,");
  });
});
