import { createBrowserConnection, createRelayTransport, MAX_FRAME_BYTES } from "@homarr/remote-protocol";
import type { GlobalMcpOptions } from "./types";

function relayUrl(value: string, internal = false): string {
  const url = new URL(value);
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.username || url.password || url.search || url.hash || !["ws:", "wss:"].includes(url.protocol))
    throw new Error("Invalid MCP relay address");
  if (url.protocol === "ws:" && !internal && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("MCP relays require WSS outside loopback");
  return url.toString().replace(/\/$/, "");
}
export function approvedRelay(options: GlobalMcpOptions, publicRelay: string | null): URL {
  if (!publicRelay) throw new Error("Hosted MCP requires a relay connection");
  const origin = new URL(options.publicUrl).origin;
  const allowlist = options.allowedRelayUrls ?? [`${origin}/relay`];
  const target = relayUrl(publicRelay);
  if (!allowlist.some((allowed) => relayUrl(allowed) === target))
    throw new Error("This relay is not enabled for hosted MCP");
  if (options.relayConnectUrl) return new URL(relayUrl(options.relayConnectUrl, true));
  return new URL(target);
}
export function createMcpRelayConnector(options: GlobalMcpOptions): NonNullable<GlobalMcpOptions["connect"]> {
  return async ({ worker, approval, identity, signal }) => {
    const grant = approval.grant;
    if (!grant || !approval.capability) throw new Error("MCP service has not been approved");
    const url = approvedRelay(options, worker.relayUrl);
    url.pathname = `${url.pathname.replace(/\/$/, "")}/connect/${encodeURIComponent(worker.workerId)}`;
    const Constructor = WebSocket as unknown as {
      new (url: string | URL, options: { headers: Record<string, string> }): WebSocket;
    };
    const socket = new Constructor(url, { headers: { Origin: new URL(options.publicUrl).origin } });
    const close = () => socket.close();
    signal.addEventListener("abort", close, { once: true });
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(failed, 10_000);
        function cleanup() {
          clearTimeout(timer);
          socket.removeEventListener("error", failed);
          socket.removeEventListener("close", failed);
          socket.removeEventListener("message", message);
          signal.removeEventListener("abort", failed);
        }
        function failed() {
          cleanup();
          socket.close();
          reject(new Error("MCP relay is unavailable"));
        }
        function message(event: MessageEvent<unknown>) {
          if (typeof event.data !== "string" || event.data.length > MAX_FRAME_BYTES) return failed();
          try {
            const body = JSON.parse(event.data) as { type?: unknown };
            if (body.type !== "connected") return failed();
          } catch {
            return failed();
          }
          cleanup();
          resolve();
        }
        socket.addEventListener("error", failed, { once: true });
        socket.addEventListener("close", failed, { once: true });
        socket.addEventListener("message", message);
        signal.addEventListener("abort", failed, { once: true });
        if (signal.aborted) {
          failed();
          return;
        }
        socket.addEventListener(
          "open",
          () => socket.send(JSON.stringify({ type: "connect", capability: approval.capability })),
          { once: true },
        );
      });
      const connection = await createBrowserConnection({
        transport: createRelayTransport(socket),
        pinnedIdentity: worker.workerPublicKey,
        workerId: worker.workerId,
        credential: { kind: "grant", token: grant.token },
        deviceIdentity: identity,
      });
      const closeConnection = connection.close;
      connection.close = () => {
        signal.removeEventListener("abort", close);
        closeConnection();
      };
      return connection;
    } catch (error) {
      signal.removeEventListener("abort", close);
      socket.close();
      throw error;
    }
  };
}
