import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { convert } from "./convert.mjs";

const controller = new AbortController();
const abort = () => controller.abort(new Error("Conversion interrupted; no output was published."));
process.once("SIGTERM", abort);
process.once("SIGINT", abort);

try {
  const { values } = parseArgs({
    options: { output: { type: "string" }, "homarr-stopped": { type: "boolean" }, help: { type: "boolean" } },
  });
  if (values.help) {
    console.log(
      "Usage: node src/cli.mjs --output /output/db.sqlite --homarr-stopped\nSet MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE; optional MYSQL_PORT (3306), MYSQL_SSL_CA (PEM file). Supports Homarr v1.77.1 only.",
    );
  } else {
    for (const key of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]) {
      if (!process.env[key]) throw new Error(`Missing ${key}`);
    }
    const port = Number(process.env.MYSQL_PORT ?? 3306);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid MYSQL_PORT");
    const result = await convert({
      connectionOptions: {
        host: process.env.MYSQL_HOST,
        port,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        ...(process.env.MYSQL_SSL_CA ? { ssl: { ca: readFileSync(process.env.MYSQL_SSL_CA) } } : {}),
      },
      output: values.output,
      homarrStopped: values["homarr-stopped"],
      signal: controller.signal,
    });
    console.log(
      `Verified ${Object.keys(result.counts).length} tables (${Object.values(result.counts).reduce((a, b) => a + b, 0)} rows). Created ${result.output}.`,
    );
    console.log(
      "Start v2 with this SQLite file, the original appdata, and the same SECRET_ENCRYPTION_KEY. Keep MySQL unchanged for rollback.",
    );
  }
} catch (error) {
  // Driver errors may embed query values. Only print our validation messages or
  // the driver's error code, never its SQL, connection object, or credentials.
  console.error(
    error.code
      ? `Conversion failed (${error.code}). Source unchanged; check connectivity and the supported source schema.`
      : error.message,
  );
  process.exitCode = 1;
} finally {
  process.removeListener("SIGTERM", abort);
  process.removeListener("SIGINT", abort);
}
