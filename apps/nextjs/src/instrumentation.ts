export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@homarr/tasks");
    await import("@homarr/websocket");
  }
}
