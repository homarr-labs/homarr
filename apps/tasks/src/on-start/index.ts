import { cleanupSessionsAsync } from "./session-cleanup";
import { warmUpdateCheckerAsync } from "./warm-update-checker";

export async function onStartAsync() {
  await cleanupSessionsAsync();
  await warmUpdateCheckerAsync();
}
