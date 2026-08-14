import { expect, test } from "vitest";

import { createId } from "@homarr/common";

import { acquireCustomWidgetRequestLimit } from "../../custom-widget/request-limits";

test("enforces the server-side DELETE rate limit with retry metadata", async () => {
  const input = { category: "delete" as const, userId: createId(), itemId: createId(), definitionId: createId() };
  for (let count = 0; count < 3; count += 1) {
    const release = await acquireCustomWidgetRequestLimit(input);
    await release();
  }

  try {
    await acquireCustomWidgetRequestLimit(input);
    expect.unreachable("the fourth DELETE request should be rate limited");
  } catch (error) {
    expect(error).toMatchObject({ code: "TOO_MANY_REQUESTS" });
    const cause = (error as { cause?: { flatten?: () => Record<string, unknown> } }).cause;
    expect(cause?.flatten?.()).toMatchObject({ retryAfterMs: expect.any(Number) });
  }
});

test("enforces four concurrent requests per user and item", async () => {
  const input = { category: "query" as const, userId: createId(), itemId: createId(), definitionId: createId() };
  const releases = await Promise.all(Array.from({ length: 4 }, () => acquireCustomWidgetRequestLimit(input)));

  await expect(acquireCustomWidgetRequestLimit(input)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  await Promise.all(releases.map((release) => release()));
});
