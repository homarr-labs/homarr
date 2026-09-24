import { describe, expect, test } from "vitest";

import {
  createCustomWidgetFollowUpEditController,
  hasCustomWidgetStyleOnlyFollowUpIntent,
  hasExplicitCustomWidgetSourceChangeIntent,
} from "../core/assistant-follow-up";

const persistedDefinition = {
  id: "mealie-widget-1",
  $schema: "homarr-custom-widget-v2",
  name: "Mealie Tonight",
  sources: {
    default: {
      type: "integration",
      integrationKind: "mealie",
      integrationId: "mealie-home",
    },
  },
  requests: {
    meals: { source: "default", path: "/api/households/mealplans/today", trigger: "load" },
  },
  options: { title: { label: "Title", control: "text", default: "Tonight" } },
  template: "<Stack><Title>{options.title}</Title><Text>{data.meals?.name}</Text></Stack>",
};

const previewInput = (changes: Record<string, unknown> = {}) => ({
  definitionId: persistedDefinition.id,
  definition: { ...persistedDefinition, ...changes },
});

describe("Custom Widget follow-up edit guard", () => {
  test("forces an exact reload and update preview instead of creating a duplicate", () => {
    const controller = createCustomWidgetFollowUpEditController({
      definitionId: persistedDefinition.id,
      preserveDataContract: true,
      allowSourceChanges: false,
    });

    expect(controller.validateInput("customWidget_previewCreate", previewInput())).toMatchObject({
      recovery: { kind: "follow-up-definition-load-required", requiredNextTool: "customWidget_get" },
    });
    expect(controller.validateInput("customWidget_get", { id: "another-widget" })).toMatchObject({
      recovery: { kind: "follow-up-definition-load-required", requiredNextTool: "customWidget_get" },
    });
    expect(controller.validateInput("customWidget_get", { id: persistedDefinition.id })).toBeNull();
    controller.observeResult("customWidget_get", persistedDefinition);

    expect(
      controller.validateInput("customWidget_previewCreate", {
        definition: persistedDefinition,
      }),
    ).toMatchObject({ recovery: { kind: "follow-up-definition-target-mismatch" } });
    expect(controller.validateInput("customWidget_createFromPreview", { previewSessionId: "preview-1" })).toMatchObject(
      { recovery: { kind: "follow-up-definition-target-mismatch" } },
    );
    expect(
      controller.validateInput(
        "customWidget_previewCreate",
        previewInput({ template: '<Stack gap="xs"><Text c="violet">{data.meals?.name}</Text></Stack>' }),
      ),
    ).toBeNull();
  });

  test("keeps style-only edits from silently changing requests, options, or integration binding", () => {
    const controller = createCustomWidgetFollowUpEditController({
      definitionId: persistedDefinition.id,
      preserveDataContract: true,
      allowSourceChanges: false,
    });
    controller.observeResult("customWidget_get", persistedDefinition);

    expect(
      controller.validateInput(
        "customWidget_previewCreate",
        previewInput({ requests: { meals: { source: "default", path: "/api/foods", trigger: "load" } } }),
      ),
    ).toMatchObject({ recovery: { kind: "follow-up-data-contract-changed" } });
    expect(
      controller.validateInput(
        "customWidget_previewCreate",
        previewInput({ options: { count: { label: "Count", control: "number", default: 5 } } }),
      ),
    ).toMatchObject({ recovery: { kind: "follow-up-data-contract-changed" } });
    expect(
      controller.validateInput(
        "customWidget_previewCreate",
        previewInput({
          sources: {
            default: {
              type: "integration",
              integrationKind: "mealie",
              integrationId: "invented-mealie",
            },
          },
        }),
      ),
    ).toMatchObject({ recovery: { kind: "follow-up-source-binding-changed" } });
  });

  test("allows requested feature and endpoint changes while retaining the saved integration", () => {
    const controller = createCustomWidgetFollowUpEditController({
      definitionId: persistedDefinition.id,
      preserveDataContract: false,
      allowSourceChanges: false,
    });
    controller.observeResult("customWidget_get", persistedDefinition);

    expect(
      controller.validateInput(
        "customWidget_previewCreate",
        previewInput({
          requests: {
            ...persistedDefinition.requests,
            week: { source: "default", path: "/api/households/mealplans/week", trigger: "load" },
          },
          template: "<Stack><Text>{data.meals?.name}</Text><Text>{data.week?.length ?? 0}</Text></Stack>",
        }),
      ),
    ).toBeNull();
  });

  test("allows rebinding only when the user explicitly requested a source change", () => {
    const controller = createCustomWidgetFollowUpEditController({
      definitionId: persistedDefinition.id,
      preserveDataContract: false,
      allowSourceChanges: true,
    });
    controller.observeResult("customWidget_get", persistedDefinition);

    expect(
      controller.validateInput(
        "customWidget_previewCreate",
        previewInput({
          sources: {
            default: {
              type: "integration",
              integrationKind: "mealie",
              integrationId: "mealie-cabin",
            },
          },
        }),
      ),
    ).toBeNull();
  });

  test.each(["Make it purple", "Use a compact header", "Adjust the spacing and wrap long labels"])(
    "classifies presentation-only follow-ups: %s",
    (text) => {
      expect(hasCustomWidgetStyleOnlyFollowUpIntent(text)).toBe(true);
    },
  );

  test.each(["Add a weekly meal request", "Show another status field", "Add a retry action button"])(
    "does not freeze feature or request follow-ups: %s",
    (text) => {
      expect(hasCustomWidgetStyleOnlyFollowUpIntent(text)).toBe(false);
    },
  );

  test("requires explicit rebinding language before allowing a source change", () => {
    expect(hasExplicitCustomWidgetSourceChangeIntent("Switch it to a different Mealie integration")).toBe(true);
    expect(hasExplicitCustomWidgetSourceChangeIntent("Add more fields from my Mealie integration")).toBe(false);
  });
});
