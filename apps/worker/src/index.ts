// The local state implementation must be chosen before any domain/cache imports.
process.env.HOMARR_STATE_BACKEND ??= "memory";

const [{ openWorkerState }, { startWorkerServer }] = await Promise.all([import("./state"), import("./server")]);
const state = await openWorkerState();
const runtime = startWorkerServer(state);
console.log(
  `Homarr worker listening on ${runtime.server.url.origin}; pairing is available through the local homarr-worker pair command`,
);
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 8000);
    timeout.unref();
    await runtime.stop();
    process.exit(0);
  });
