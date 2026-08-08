import { cleanupSessionsAsync } from "./session-cleanup";

export async function onStartAsync() {
  await cleanupSessionsAsync();
}
