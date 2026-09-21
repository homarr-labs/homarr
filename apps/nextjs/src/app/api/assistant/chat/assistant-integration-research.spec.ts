import { describe, expect, test } from "vitest";

import {
  assistantIntegrationResearchSchema,
  assistantIntegrationResearchToolName,
  getAssistantIntegrationResearchOutput,
} from "@homarr/custom-widgets/core";

import {
  createAssistantIntegrationResearchController,
  getCustomWidgetProductionInstructions,
} from "./assistant-integration-research";

const readyResearch = {
  status: "ready" as const,
  service: "Mealie",
  connection: {
    type: "savedIntegration" as const,
    integrationId: "integration-mealie",
    integrationName: "Family meals",
    integrationKind: "mealie",
  },
  authentication: "Bearer token supplied by the saved integration adapter",
  officialSources: [{ url: "https://docs.mealie.io/documentation/getting-started/api-usage/", title: "Mealie API" }],
  endpoints: [
    {
      purpose: "Read today's meal plan",
      method: "GET" as const,
      path: "/api/households/mealplans/today",
      query: [],
      responseShape: "An object containing the day's meal entries",
    },
  ],
  limitations: [],
};

const discoverMealie = (options: { supportsHttpRequests?: boolean; hasFullAccess?: boolean } = {}) => {
  const controller = createAssistantIntegrationResearchController("Mealie");
  controller.observe("homarr_enableToolGroups", { enabledGroups: ["integration"] });
  controller.observe("integration_getKinds", [
    {
      kind: "mealie",
      name: "Mealie",
      supportsHttpRequests: options.supportsHttpRequests ?? true,
    },
  ]);
  controller.observe("integration_all", [
    {
      id: "integration-mealie",
      name: "Family meals",
      kind: "mealie",
      permissions: { hasFullAccess: options.hasFullAccess ?? true },
    },
  ]);
  return controller;
};

describe("Assistant integration research", () => {
  test("records a bounded official API contract for later lifecycle steps", () => {
    const parsed = assistantIntegrationResearchSchema.parse(readyResearch);

    expect(getAssistantIntegrationResearchOutput(parsed)).toMatchObject({
      recorded: true,
      service: "Mealie",
      connection: { type: "savedIntegration", integrationId: "integration-mealie" },
      endpoints: [{ method: "GET", path: "/api/households/mealplans/today" }],
    });
  });

  test.each([
    {
      ...readyResearch,
      officialSources: [{ url: "https://token:secret@docs.mealie.io/api", title: "Unsafe" }],
    },
    { ...readyResearch, endpoints: [{ ...readyResearch.endpoints[0], path: "https://mealie.example/api" }] },
    { ...readyResearch, officialSources: [] },
    { ...readyResearch, endpoints: [] },
  ])("rejects unsafe or incomplete research records", (candidate) => {
    expect(assistantIntegrationResearchSchema.safeParse(candidate).success).toBe(false);
  });

  test("makes missing documentation a terminal safe outcome", () => {
    const parsed = assistantIntegrationResearchSchema.parse({
      status: "unavailable",
      service: "Dispatcharr",
      reason: "No official endpoint contract was available.",
      attemptedSources: [],
    });

    expect(getAssistantIntegrationResearchOutput(parsed)).toMatchObject({
      recorded: false,
      status: "unavailable",
    });
    expect(getAssistantIntegrationResearchOutput(parsed).nextStep).toContain("Stop before authoring");
  });

  test("requires a matching service and a real web attempt before declaring research unavailable", () => {
    const webResearch = createAssistantIntegrationResearchController("Dispatcharr", { webResearchEnabled: true });
    webResearch.observe("homarr_enableToolGroups", { enabledGroups: ["integration"] });
    webResearch.observe("integration_getKinds", []);
    webResearch.observe("integration_all", []);
    const noAttempt = assistantIntegrationResearchSchema.parse({
      status: "unavailable",
      service: "Dispatcharr",
      reason: "No official contract found.",
      attemptedSources: [],
    });
    expect(webResearch.validate(noAttempt)).toContain("at least one attempted");
    expect(webResearch.validate({ ...noAttempt, service: "Something else" })).toContain("requested service");

    const withoutWeb = createAssistantIntegrationResearchController("Dispatcharr");
    withoutWeb.observe("homarr_enableToolGroups", { enabledGroups: ["integration"] });
    withoutWeb.observe("integration_getKinds", []);
    withoutWeb.observe("integration_all", []);
    expect(withoutWeb.validate(noAttempt)).toBeNull();
  });

  test("keeps the unknown-service direct HTTP path distinct from a selected saved integration", () => {
    const directHttp = assistantIntegrationResearchSchema.parse({
      ...readyResearch,
      service: "Dispatcharr",
      connection: {
        type: "directHttp",
        integrationKindAvailable: false,
        baseUrlSource: "secureConfigurationPlaceholder",
      },
    });
    expect(getAssistantIntegrationResearchOutput(directHttp)).toMatchObject({
      recorded: true,
      connection: {
        type: "directHttp",
        integrationKindAvailable: false,
        baseUrlSource: "secureConfigurationPlaceholder",
      },
    });

    expect(
      assistantIntegrationResearchSchema.safeParse({
        ...readyResearch,
        connection: {
          type: "directHttp",
          integrationKindAvailable: true,
          baseUrlSource: "secureConfigurationPlaceholder",
        },
      }).success,
    ).toBe(false);
  });

  test("defines the complete saved-integration research and placement path", () => {
    const enabled = getCustomWidgetProductionInstructions(true);
    expect(enabled).toContain("integration_getKinds and integration_all");
    expect(enabled).toContain(assistantIntegrationResearchToolName);
    expect(enabled).toContain("integration_request");
    expect(enabled).toContain("Never probe a write");
    expect(enabled).toContain("no integration kind");
    expect(enabled).toContain("never bypass it with a direct HTTP source");
    expect(enabled).toContain("requestContext.currentBoard");
    expect(enabled).toContain("targetBoardId");

    const disabled = getCustomWidgetProductionInstructions(false);
    expect(disabled).toContain("Web research is unavailable");
    expect(disabled).toContain("stop before authoring");
    expect(disabled).not.toContain("web_fetch only");
  });

  test("stages discovery, exact research, and a documented GET probe", () => {
    const controller = createAssistantIntegrationResearchController("Mealie");
    expect(controller.getStage()).toBe("enable-integration-tools");
    controller.observe("homarr_enableToolGroups", { enabledGroups: ["integration"] });
    expect(controller.getStage()).toBe("discover-kinds");
    controller.observe("integration_getKinds", [{ kind: "mealie", name: "Mealie", supportsHttpRequests: true }]);
    expect(controller.getStage()).toBe("discover-saved-integrations");
    controller.observe("integration_all", [
      {
        id: "integration-mealie",
        name: "Family meals",
        kind: "mealie",
        permissions: { hasFullAccess: true },
      },
    ]);
    expect(controller.getStage()).toBe("record-research");

    const research = assistantIntegrationResearchSchema.parse(readyResearch);
    expect(controller.validate(research)).toBeNull();
    controller.record(research);
    expect(controller.getStage()).toBe("probe-saved-integration");
    expect(
      controller.validateProbe({
        integrationId: "integration-mealie",
        method: "GET",
        path: "/api/households/mealplans/today",
      }),
    ).toBeNull();
    controller.observe("integration_request", {
      integration: { id: "integration-mealie", name: "Family meals", kind: "mealie" },
      ok: true,
      status: 200,
      data: { items: [] },
    });
    expect(controller.getStage()).toBe("ready");
  });

  test.each(["integration_getKinds", "integration_all"])(
    "terminates research after a failed %s prerequisite instead of retrying forever",
    (toolName) => {
      const controller = createAssistantIntegrationResearchController("Dispatcharr");
      controller.observe("homarr_enableToolGroups", { enabledGroups: ["integration"] });
      if (toolName === "integration_all") {
        controller.observe("integration_getKinds", [{ kind: "mealie", name: "Mealie", supportsHttpRequests: true }]);
      }
      controller.observeFailure(toolName);
      expect(controller.getStage()).toBe("unavailable");
    },
  );

  test("terminates malformed discovery output instead of requiring the same tool again", () => {
    const controller = createAssistantIntegrationResearchController("Dispatcharr");
    controller.observe("homarr_enableToolGroups", { enabledGroups: ["integration"] });
    controller.observe("integration_getKinds", { error: "unavailable" });
    expect(controller.getStage()).toBe("unavailable");
  });

  test.each([
    ["a hallucinated ID", { connection: { ...readyResearch.connection, integrationId: "invented" } }],
    ["a hallucinated name", { connection: { ...readyResearch.connection, integrationName: "Invented" } }],
    ["a hallucinated kind", { connection: { ...readyResearch.connection, integrationKind: "frigate" } }],
  ])("rejects %s instead of trusting the model", (_, change) => {
    const controller = discoverMealie();
    const research = assistantIntegrationResearchSchema.parse({ ...readyResearch, ...change });
    expect(controller.validate(research)).not.toBeNull();
    expect(controller.getStage()).toBe("record-research");
  });

  test("rejects saved integrations without both HTTP support and full access", () => {
    const unsupported = discoverMealie({ supportsHttpRequests: false });
    expect(unsupported.validate(assistantIntegrationResearchSchema.parse(readyResearch))).toContain(
      "does not support HTTP",
    );

    const denied = discoverMealie({ hasFullAccess: false });
    expect(denied.validate(assistantIntegrationResearchSchema.parse(readyResearch))).toContain(
      "does not grant full access",
    );
  });

  test("blocks direct HTTP for a known kind but permits a genuinely unknown service", () => {
    const directMealie = assistantIntegrationResearchSchema.parse({
      ...readyResearch,
      connection: {
        type: "directHttp",
        integrationKindAvailable: false,
        baseUrlSource: "secureConfigurationPlaceholder",
      },
    });
    expect(discoverMealie().validate(directMealie)).toContain("Direct HTTP is forbidden");

    const dispatcharr = createAssistantIntegrationResearchController("Dispatcharr");
    dispatcharr.observe("homarr_enableToolGroups", { enabledGroups: ["integration"] });
    dispatcharr.observe("integration_getKinds", [{ kind: "mealie", name: "Mealie", supportsHttpRequests: true }]);
    dispatcharr.observe("integration_all", []);
    const directDispatcharr = assistantIntegrationResearchSchema.parse({
      ...readyResearch,
      service: "Dispatcharr",
      connection: {
        type: "directHttp",
        integrationKindAvailable: false,
        baseUrlSource: "secureConfigurationPlaceholder",
      },
    });
    expect(dispatcharr.validate(directDispatcharr)).toBeNull();
    dispatcharr.record(directDispatcharr);
    expect(dispatcharr.getStage()).toBe("ready");
  });

  test("rejects a probe that changes integration, method, or documented path", () => {
    const controller = discoverMealie();
    const research = assistantIntegrationResearchSchema.parse(readyResearch);
    expect(controller.validate(research)).toBeNull();
    controller.record(research);
    const documentedPath = readyResearch.endpoints[0]?.path;
    expect(documentedPath).toBeDefined();
    if (!documentedPath) return;

    expect(controller.validateProbe({ integrationId: "invented", method: "GET", path: documentedPath })).toContain(
      "exact saved integration",
    );
    expect(
      controller.validateProbe({
        integrationId: "integration-mealie",
        method: "POST",
        path: documentedPath,
      }),
    ).toContain("Only documented GET");
    expect(
      controller.validateProbe({ integrationId: "integration-mealie", method: "GET", path: "/api/admin/users" }),
    ).toContain("exact GET path");
  });

  test("allows repeated documented query keys and rejects undocumented query keys or fragments", () => {
    const controller = discoverMealie();
    const research = assistantIntegrationResearchSchema.parse({
      ...readyResearch,
      endpoints: [{ ...readyResearch.endpoints[0], query: ["page", "tag"] }],
    });
    expect(controller.validate(research)).toBeNull();
    controller.record(research);

    expect(
      controller.validateProbe({
        integrationId: "integration-mealie",
        method: "GET",
        path: "/api/households/mealplans/today?tag=dinner&tag=quick&page=1",
      }),
    ).toBeNull();
    expect(
      controller.validateProbe({
        integrationId: "integration-mealie",
        method: "GET",
        path: "/api/households/mealplans/today?admin=true",
      }),
    ).toContain("was not documented");
    expect(
      controller.validateProbe({
        integrationId: "integration-mealie",
        method: "GET",
        path: "/api/households/mealplans/today#secrets",
      }),
    ).toContain("cannot contain a fragment");
  });

  test("requires the user to disambiguate multiple matching saved integrations", () => {
    const kinds = [{ kind: "mealie", name: "Mealie", supportsHttpRequests: true }];
    const integrations = [
      {
        id: "integration-mealie",
        name: "Family meals",
        kind: "mealie",
        permissions: { hasFullAccess: true },
      },
      {
        id: "integration-mealie-work",
        name: "Work meals",
        kind: "mealie",
        permissions: { hasFullAccess: true },
      },
    ];
    const controller = createAssistantIntegrationResearchController("Mealie");
    controller.observe("homarr_enableToolGroups", { enabledGroups: ["integration"] });
    controller.observe("integration_getKinds", kinds);
    controller.observe("integration_all", integrations);

    expect(controller.validate(assistantIntegrationResearchSchema.parse(readyResearch))).toContain(
      "Multiple matching full-access saved integrations",
    );

    const namedController = createAssistantIntegrationResearchController("Family meals");
    namedController.observe("homarr_enableToolGroups", { enabledGroups: ["integration"] });
    namedController.observe("integration_getKinds", kinds);
    namedController.observe("integration_all", integrations);
    expect(namedController.validate(assistantIntegrationResearchSchema.parse(readyResearch))).toBeNull();
  });
});
