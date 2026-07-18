import { describe, expect, it } from "vitest";

import {
  claimCustomWidgetSecretRequest,
  completeCustomWidgetSecretRequest,
  createCustomWidgetSecretRequest,
  getCustomWidgetSecretRequestForUser,
  releaseCustomWidgetSecretRequest,
} from "../../custom-widget/secret-requests";

describe("custom widget credential requests", () => {
  it("is user-scoped, one-time, and reports completion without a secret", async () => {
    const request = await createCustomWidgetSecretRequest({
      userId: "user-1",
      target: { type: "preview", id: "preview-1" },
      widgetName: "Printer",
      sourceId: "default",
      sourceName: "Printer API",
      kinds: ["apiKey"],
    });

    expect(await getCustomWidgetSecretRequestForUser(request.id, "user-2")).toBeNull();
    expect(await claimCustomWidgetSecretRequest(request.id)).toMatchObject({ status: "pending" });
    expect(await claimCustomWidgetSecretRequest(request.id)).toBeNull();
    await releaseCustomWidgetSecretRequest(request.id);
    expect(await claimCustomWidgetSecretRequest(request.id)).not.toBeNull();
    await completeCustomWidgetSecretRequest(request.id);
    expect(await getCustomWidgetSecretRequestForUser(request.id, "user-1")).toMatchObject({ status: "completed" });
    expect(await claimCustomWidgetSecretRequest(request.id)).toBeNull();
  });
});
