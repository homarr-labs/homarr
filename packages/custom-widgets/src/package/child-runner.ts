// JavaScript source avoids capturing esbuild/SWC helpers from transpiled function serialization.
const entrypoint = String.raw`
const { randomUUID } = require("node:crypto");
const running = new Map();
const pending = new Map();
const loaded = require(process.argv[2]);
const handlers = loaded.default ?? loaded;
const errorMessage = (error) => error instanceof Error ? error.message : String(error);
function send(message) {
  return new Promise((resolve, reject) => {
    if (!process.send || !process.connected) return reject(new Error("Widget host disconnected"));
    try {
      if (Buffer.byteLength(JSON.stringify(message), "utf8") > 8 * 1024 * 1024) {
        return reject(new Error("Widget IPC message exceeds 8 MiB; stream smaller chunks"));
      }
      process.send(message, (error) => { if (error) reject(error); else resolve(); });
    } catch (error) { reject(new Error(errorMessage(error))); }
  });
}
function sdk(invocationId, operation, input) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    pending.set(id, { invocationId, resolve, reject });
    void send({ type: "sdk", id, invocationId, operation, input }).catch((error) => {
      pending.delete(id);
      reject(error);
    });
  });
}
async function invoke(message) {
  const controller = new AbortController();
  running.set(message.id, controller);
  try {
    const handler = handlers[message.handler];
    if (typeof handler !== "function") throw new Error("Handler '" + message.handler + "' is not exported");
    const result = await handler(message.input, {
      ...message.context, signal: controller.signal,
      sdk: { invoke: (operation, input) => sdk(message.id, operation, input) },
    });
    if (message.kind === "subscription") {
      if (!result || typeof result !== "object" || !(Symbol.asyncIterator in result)) {
        throw new Error("Subscription handlers must return an AsyncIterable");
      }
      for await (const value of result) {
        if (controller.signal.aborted) break;
        await send({ type: "event", id: message.id, value });
      }
      await send({ type: "result", id: message.id });
    } else await send({ type: "result", id: message.id, value: result });
  } catch (error) {
    await send({ type: "result", id: message.id, error: errorMessage(error), errorCode: typeof error?.code === "string" ? error.code : undefined }).catch(() => undefined);
  } finally {
    controller.abort();
    running.delete(message.id);
    for (const [id, request] of pending) {
      if (request.invocationId !== message.id) continue;
      pending.delete(id);
      request.reject(new Error("Widget invocation ended"));
    }
  }
}
process.on("message", (message) => {
  if (message.type === "invoke") void invoke(message);
  if (message.type === "cancel") {
    running.get(message.id)?.abort();
    for (const [id, request] of pending) {
      if (request.invocationId !== message.id) continue;
      pending.delete(id);
      request.reject(new Error("Widget invocation cancelled"));
    }
  }
  if (message.type === "sdk-result") {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(Object.assign(new Error(message.error), { code: message.errorCode }));
    else request.resolve(message.value);
  }
  if (message.type === "shutdown") {
    for (const controller of running.values()) controller.abort();
    process.exit(0);
  }
});
process.on("disconnect", () => process.exit(0));
const heartbeat = setInterval(() => void send({ type: "heartbeat" }).catch(() => process.exit(1)), 2_000);
heartbeat.unref();
void send({ type: "ready", handlers: Object.keys(handlers).filter((name) => typeof handlers[name] === "function") });
`;

export function getWidgetChildEntrypoint(): string {
  return entrypoint;
}
