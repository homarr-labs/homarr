import { definePlugin } from "nitro";

export function createLifecyclePlugin(dispose: () => Promise<void>) {
  return definePlugin((nitro) => {
    let disposal: Promise<void> | undefined;
    const startDisposal = () => (disposal ??= dispose());
    const signals = ["SIGINT", "SIGTERM"] as const;
    const initiateShutdown = () => {
      void startDisposal().catch((error: unknown) => console.error("Application shutdown failed", error));
    };
    if (!import.meta.dev && typeof Bun !== "undefined" && !process.env.CI && !process.env.TEST) {
      for (const signal of signals) process.prependListener(signal, initiateShutdown);
    }
    nitro.hooks.hook("close", async () => {
      try {
        await startDisposal();
      } finally {
        for (const signal of signals) process.off(signal, initiateShutdown);
      }
    });
  });
}
