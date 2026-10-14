import assert from "node:assert/strict";
import { test } from "vitest";

import { createLegacyStatsGuard } from "./legacy-guard";

test("the 128 physical legacy slots survive caller cancellation until actual settlement", async () => {
  const guard = createLegacyStatsGuard();
  const settlement = Promise.withResolvers<undefined>();
  const controller = new AbortController();
  const pending = Array.from({ length: 128 }, (_, index) =>
    guard.runAsync(`legacy-${index}`, controller.signal, () => settlement.promise),
  );
  const callerDeadline = Promise.withResolvers<never>();
  const caller = Promise.race([pending[0], callerDeadline.promise]);
  try {
    controller.abort();
    callerDeadline.reject(new Error("Synthetic caller deadline"));
    await assert.rejects(caller, /caller deadline/);
    await assert.rejects(
      guard.runAsync("legacy-0", new AbortController().signal, async () => undefined),
      /still running/,
    );
    await assert.rejects(
      guard.runAsync("legacy-128", new AbortController().signal, async () => undefined),
      /limit reached/,
    );
    settlement.resolve(undefined);
    await Promise.all(pending);
    await guard.runAsync("legacy-0", new AbortController().signal, async () => undefined);
    await assert.rejects(
      guard.runAsync("aborted", controller.signal, async () => {
        throw new Error("Should not execute");
      }),
    );
    await assert.rejects(
      guard.runAsync("failed", new AbortController().signal, async () => {
        throw new Error("Synthetic SDK failure");
      }),
    );
    await guard.runAsync("failed", new AbortController().signal, async () => undefined);
  } finally {
    settlement.resolve(undefined);
    await Promise.allSettled(pending);
  }
});
