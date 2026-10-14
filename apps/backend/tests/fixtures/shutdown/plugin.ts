import { strict as assert } from "node:assert";

import { definePlugin } from "nitro";

import { createLifecyclePlugin } from "../../../server/lifecycle";
import { application } from "./host";

export default definePlugin((nitro) => {
  const signals = ["SIGINT", "SIGTERM"] as const;
  const previous = signals.map((signal) => process.listeners(signal));
  createLifecyclePlugin(() => application.dispose())(nitro);
  const owned = signals.map((signal, index) =>
    process.listeners(signal).filter((handler) => !previous[index].includes(handler)),
  );
  nitro.hooks.hook("close", () => {
    for (const [index, signal] of signals.entries()) {
      assert(owned[index].length === 1);
      assert(owned[index].every((handler) => !process.listeners(signal).includes(handler)));
      assert(previous[index].every((handler) => process.listeners(signal).includes(handler)));
    }
    console.log("signal-handlers-removed");
  });
});
