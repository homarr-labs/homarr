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
    const dialog = readSource("apps/nextjs/src/components/custom-widgets/custom-widget-import-dialog.tsx");

    expect(dialog).toContain("customWidget.migrateLegacy.useMutation");
    expect(dialog).toContain("migrateMutation.mutate({ id: legacyId, widget: configuredWidget, secrets })");
    expect(dialog).toContain("utils.customWidget.list.invalidate()");
    expect(dialog).toContain("utils.customWidget.available.invalidate()");
    expect(dialog).toContain("utils.widget.customApi.getData.invalidate()");
  });
});
