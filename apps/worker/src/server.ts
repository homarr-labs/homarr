import { Hono } from "hono";
import { stopWorkerServices } from "./services";
import type { ServerWebSocket } from "bun";

import { createWorkerRequestHandler } from "./control";
import { createTransport, WorkerChannels, connectRelay } from "./transport";
import type { IngressTransport } from "./transport";
import type { WorkerState } from "./state";

interface SocketState {
  accepted: boolean;
  ingress?: IngressTransport;
  timer?: ReturnType<typeof setTimeout>;
}
const maximumQueuedBytes = 4 * 1024 * 1024;
function equalCapability(actual: unknown, expected: string) {
  if (typeof actual !== "string" || actual.length !== 43) return false;
  let difference = 0;
  for (let index = 0; index < 43; index++) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export function startWorkerServer(state: WorkerState, options: { port?: number; hostname?: string } = {}) {
  const app = new Hono();
  let ready = true;
  const channels = new WorkerChannels(
    state,
    createWorkerRequestHandler(state, () => channels),
  );
  const sockets = new Set<ServerWebSocket<SocketState>>();
  const origins = new Set(
    (process.env.WORKER_ALLOWED_ORIGINS ?? new URL(state.platformUrl).origin)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  app.get("/api/health/live", (context) => context.json({ status: "healthy" }));
  app.get("/api/health/ready", (context) => context.json({ status: ready ? "ready" : "stopping" }, ready ? 200 : 503));
  // Deliberately no unauthenticated RPC, onboarding, token, metadata or dashboard routes.
  app.all("*", (context) => context.json({ error: "Encrypted worker connection required" }, 404));

  const closePeer = (socket: ServerWebSocket<SocketState>) => {
    clearTimeout(socket.data.timer);
    socket.data.ingress?.ended();
    sockets.delete(socket);
  };
  const server = Bun.serve<SocketState>({
    hostname: options.hostname ?? process.env.WORKER_HOST ?? "0.0.0.0",
    port: options.port ?? Number(process.env.WORKER_PORT ?? process.env.BACKEND_PORT ?? 3002),
    maxRequestBodySize: 1024,
    idleTimeout: 0,
    fetch(request, runtime) {
      const url = new URL(request.url);
      if (url.pathname === "/remote/connect") {
        const origin = request.headers.get("origin");
        if (url.search || (origin && !origins.has(origin)) || sockets.size >= 16)
          return new Response(null, { status: 403 });
        if (runtime.upgrade(request, { data: { accepted: false } })) return;
        return new Response(null, { status: 426 });
      }
      return app.fetch(request);
    },
    websocket: {
      maxPayloadLength: 1_048_576,
      backpressureLimit: maximumQueuedBytes,
      closeOnBackpressureLimit: true,
      idleTimeout: 120,
      open(socket) {
        sockets.add(socket);
        socket.data.timer = setTimeout(() => socket.close(1008, "Connection authorization required"), 8000);
        socket.data.timer.unref();
      },
      message(socket, payload) {
        if (typeof payload !== "string") {
          socket.close(1008, "Text frames required");
          return;
        }
        if (!socket.data.accepted) {
          try {
            if (payload.length > 1024) throw new Error();
            const value = JSON.parse(payload) as { type?: string; capability?: unknown };
            if (value.type !== "connect" || !equalCapability(value.capability, state.capability)) throw new Error();
            clearTimeout(socket.data.timer);
            socket.data.accepted = true;
            const ingress = createTransport(
              (frame) => {
                if (socket.getBufferedAmount() > maximumQueuedBytes) {
                  socket.close(1008, "Backpressure limit");
                  throw new Error("Backpressure limit");
                }
                socket.send(frame);
              },
              () => {
                closePeer(socket);
                socket.close();
              },
            );
            socket.data.ingress = ingress;
            socket.send(JSON.stringify({ type: "connected" }));
            void channels.accept(ingress.transport).catch(() => {
              closePeer(socket);
              socket.close(1008, "Connection authorization failed");
            });
          } catch {
            socket.close(1008, "Connection authorization failed");
          }
          return;
        }
        socket.data.ingress?.message(payload);
      },
      close(socket) {
        closePeer(socket);
      },
    },
  });
  let stopRelay: (() => void) | undefined;
  if (state.relayUrl) stopRelay = connectRelay(state, channels);
  return {
    server,
    channels,
    async stop() {
      ready = false;
      stopWorkerServices();
      stopRelay?.();
      channels.close();
      for (const socket of sockets) {
        closePeer(socket);
        socket.close();
      }
      await server.stop(true);
      state.access.close();
    },
  };
}
