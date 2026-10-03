import { accessSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Keep standalone dependencies in a separate Turbo artifact: a combined Next
// archive exceeds Cloudflare's upload limit. Next produces both on a cold build.
function hasCurrentStandalone() {
  try {
    accessSync(".next/standalone/apps/nextjs/server.js");
    return (
      readFileSync(".next/BUILD_ID", "utf8") === readFileSync(".next/standalone/apps/nextjs/.next/BUILD_ID", "utf8")
    );
  } catch {
    return false;
  }
}

// A standalone cache entry can expire while its compiled-output entry survives.
// Rebuild in that case rather than packaging a missing or stale directory.
if (!hasCurrentStandalone()) {
  const result = spawnSync("bun", ["run", "build"], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!hasCurrentStandalone()) throw new Error("Next.js standalone output is missing or stale");
