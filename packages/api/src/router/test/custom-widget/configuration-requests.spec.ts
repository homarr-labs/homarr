import { describe, expect, it } from "vitest";

import {
  claimCustomWidgetConfigurationRequest,
  completeCustomWidgetConfigurationRequest,
  createCustomWidgetConfigurationRequest,
  getCustomWidgetConfigurationRequestForUser,
  releaseCustomWidgetConfigurationRequest,
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
    expect(await claimCustomWidgetConfigurationRequest(request.id)).toMatchObject({ status: "pending" });
    expect(await claimCustomWidgetConfigurationRequest(request.id)).toBeNull();
    await releaseCustomWidgetConfigurationRequest(request.id);
    expect(await claimCustomWidgetConfigurationRequest(request.id)).not.toBeNull();
    await completeCustomWidgetConfigurationRequest(request.id);
    expect(await getCustomWidgetConfigurationRequestForUser(request.id, "user-1")).toMatchObject({ status: "completed" });
    expect(await claimCustomWidgetConfigurationRequest(request.id)).toBeNull();
  });
});
