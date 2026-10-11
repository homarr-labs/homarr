import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const harnessRoot = resolve(import.meta.dirname);
const snapshotBoardCard = resolve(
  repositoryRoot,
  "audit-evidence/2026-10-11/baseline-source/apps/nextjs/src/app/[locale]/manage/boards/_components/board-card.tsx",
);
const production = (file: string) => resolve(repositoryRoot, file);

const auditAliases = {
  apiClient: resolve(harnessRoot, "mocks/api-client.ts"),
  commonClient: resolve(harnessRoot, "mocks/common-client.ts"),
  definitions: production("packages/definitions/src/index.ts"),
  form: production("packages/form/index.ts"),
  formsCollection: production("packages/forms-collection/src/board-create/board-create-form.tsx"),
  notifications: resolve(harnessRoot, "mocks/notifications.ts"),
  translationClient: resolve(harnessRoot, "mocks/translation-client.ts"),
  ui: resolve(harnessRoot, "mocks/ui.tsx"),
  validationBoard: production("packages/validation/src/board.ts"),
  validationFormI18n: resolve(harnessRoot, "mocks/validation-form-i18n.ts"),
};

const mockNonTargetBoardCardDependencies = {
  name: "board-card-audit-aliases",
  enforce: "pre" as const,
  resolveId(source: string, importer?: string) {
    const cleanImporter = importer?.split("?")[0];
    if (cleanImporter === snapshotBoardCard && source === "./board-card-menu-dropdown") {
      return resolve(harnessRoot, "mocks/board-card-menu-dropdown.tsx");
    }
    if (cleanImporter === snapshotBoardCard && source === "./duplicate-board-form") {
      return production("apps/nextjs/src/app/[locale]/manage/boards/_components/duplicate-board-form.tsx");
    }
    if (source === "~/components/board/board-layout-thumbnail") {
      return resolve(harnessRoot, "mocks/board-layout-thumbnail.tsx");
    }

    const aliases: Record<string, string> = {
      "@homarr/api/client": auditAliases.apiClient,
      "@homarr/common/client": auditAliases.commonClient,
      "@homarr/definitions": auditAliases.definitions,
      "@homarr/form": auditAliases.form,
      "@homarr/forms-collection": auditAliases.formsCollection,
      "@homarr/notifications": auditAliases.notifications,
      "@homarr/translation/client": auditAliases.translationClient,
      "@homarr/ui": auditAliases.ui,
      "@homarr/validation/board": auditAliases.validationBoard,
      "@homarr/validation/form/i18n": auditAliases.validationFormI18n,
      "next/navigation": resolve(harnessRoot, "mocks/next-navigation.ts"),
    };
    return aliases[source];
  },
  transform(source: string, id: string) {
    if (!id.startsWith(`${snapshotBoardCard}?candidate`)) return;

    const original = "<Collapse expanded={isDuplicateOpen}>";
    if (!source.includes(original)) throw new Error("Baseline BoardCard snapshot changed; recheck candidate patch");
    return source.replace(original, "<Collapse expanded={isDuplicateOpen} keepMounted={false}>");
  },
};

export default defineConfig({
  root: harnessRoot,
  appType: "spa",
  plugins: [mockNonTargetBoardCardDependencies, react()],
  server: {
    host: "127.0.0.1",
    port: 4179,
    strictPort: true,
  },
});
