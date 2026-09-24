import { describe, expect, it } from "vitest";

import {
  claimCustomWidgetConfigurationRequestForUser,
  completeCustomWidgetConfigurationRequest,
  createCustomWidgetConfigurationRequest,
  getCustomWidgetConfigurationRequestForUser,
  releaseCustomWidgetConfigurationRequest,
  retryCustomWidgetConfigurationRequest,
} from "../../custom-widget/configuration-requests";

describe("custom widget source configuration requests", () => {
  it("is user-scoped, one-time, and reports completion without returning configuration", async () => {
    const request = await createCustomWidgetConfigurationRequest({
      userId: "user-1",
      target: { type: "preview", id: "preview-1" },
      widgetName: "Printer",
      sourceId: "default",
      sourceName: "Printer API",
      source: { baseUrl: "http://printer.local", networkScope: "private", auth: "bearer" },
      kinds: ["apiKey"],
    });

    expect(await getCustomWidgetConfigurationRequestForUser(request.id, "user-2")).toBeNull();
    expect(await claimCustomWidgetConfigurationRequestForUser(request.id, "user-2")).toBeNull();
    expect(await claimCustomWidgetConfigurationRequestForUser(request.id, "user-1")).toMatchObject({
      userId: "user-1",
      status: "applying",
    });
    await releaseCustomWidgetConfigurationRequest(request.id);
    expect(await claimCustomWidgetConfigurationRequestForUser(request.id, "user-1")).toBeNull();
    expect(await getCustomWidgetConfigurationRequestForUser(request.id, "user-1")).toMatchObject({
      status: "applying",
    });
    await retryCustomWidgetConfigurationRequest(request.id);
    expect(await claimCustomWidgetConfigurationRequestForUser(request.id, "user-1")).toMatchObject({
      status: "applying",
    });
    expect(await claimCustomWidgetConfigurationRequestForUser(request.id, "user-1")).toBeNull();
    await releaseCustomWidgetConfigurationRequest(request.id);
    await completeCustomWidgetConfigurationRequest(request.id);
    expect(await getCustomWidgetConfigurationRequestForUser(request.id, "user-1")).toMatchObject({
      status: "completed",
    });
    expect(await claimCustomWidgetConfigurationRequestForUser(request.id, "user-1")).toBeNull();
  });

  it("only reopens an applying request through the explicit pre-mutation retry transition", async () => {
    const request = await createCustomWidgetConfigurationRequest({
      userId: "retry-user",
      target: { type: "definition", id: "definition-1" },
      widgetName: "Printer",
      sourceId: "default",
      sourceName: "Printer API",
      source: { baseUrl: "http://printer.local", networkScope: "private", auth: "bearer" },
      kinds: ["apiKey"],
    });

    await claimCustomWidgetConfigurationRequestForUser(request.id, "retry-user");
    await releaseCustomWidgetConfigurationRequest(request.id);
    expect(await claimCustomWidgetConfigurationRequestForUser(request.id, "retry-user")).toBeNull();

    await retryCustomWidgetConfigurationRequest(request.id);
    expect(await claimCustomWidgetConfigurationRequestForUser(request.id, "retry-user")).toMatchObject({
      status: "applying",
    });
  });
});
