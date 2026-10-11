import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { appDirectory, compiled } from "./standalone-artifact.mjs";

// Keep Next's generated launcher with its compilation and server configuration.
copyFileSync(join(compiled, "standalone", appDirectory, "server.js"), join(compiled, "standalone-server.js"));
