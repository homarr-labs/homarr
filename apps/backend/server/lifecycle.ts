import { definePlugin } from "nitro";

export function createLifecyclePlugin(dispose: () => Promise<void>) {
  return definePlugin((nitro) => {
    nitro.hooks.hook("close", async () => {
      await dispose();
    });
  });
}
