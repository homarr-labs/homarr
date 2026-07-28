export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  await import("@homarr/tasks");
  await import("@homarr/websocket");
}
