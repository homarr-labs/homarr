import { createApplication } from "../../../src/server/application";

export const application = createApplication({
  contributions: [
    {
      id: "shutdown-fixture",
      routes: [
        {
          phase: "stream",
          path: "/streams/lifetime",
          access: { kind: "public" },
          async handle(context) {
            const server = (
              context.request as Request & {
                readonly runtime?: { readonly bun?: { readonly server?: Bun.Server<unknown> } };
              }
            ).runtime?.bun?.server;
            if (!server) throw new Error("Fixture requires the standalone Bun listener");
            const stop = server.stop.bind(server);
            server.stop = (force) => {
              console.log("listener-drain-started");
              return stop(force);
            };
            context.signal.addEventListener("abort", () => console.log("request-aborted"), { once: true });
            context.onDispose(() => {
              console.log("request-disposed");
            });
            return {
              kind: "response",
              response: new Response(
                new ReadableStream<Uint8Array>({
                  start(controller) {
                    controller.enqueue(new TextEncoder().encode("public-stream-ready\n"));
                  },
                  async cancel() {
                    console.log("cancel-started");
                    await new Promise<void>((resolve) => setTimeout(resolve, 100));
                    console.log("cancel-settled");
                  },
                }),
              ),
            };
          },
        },
      ],
      dispose() {
        console.log("contribution-disposed");
      },
    },
  ],
});
