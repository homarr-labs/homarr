import { writeFile } from "node:fs/promises";

import { openApiDocument } from "../packages/api/src/open-api";

const baseUrl = "http://localhost:3000";
const generated = openApiDocument(baseUrl);

await writeFile("apps/docs/static/api/open-api-schema.json", `${JSON.stringify(generated, null, 2)}\n`, "utf8");
