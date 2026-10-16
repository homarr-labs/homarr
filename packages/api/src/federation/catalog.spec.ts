import { walkProcedureContractsAsync } from "@orpc/server";
import { expect, test } from "vitest";

import type { ApiMeta } from "../procedure";
import { appRouter } from "../root";
import { federationManyOperations } from "./operations";

test("every native operation using multiple integrations has a declared federation result contract", async () => {
  const missing: string[] = [];
  await walkProcedureContractsAsync(appRouter, (procedure, path) => {
    const meta = procedure["~orpc"].meta as ApiMeta;
    if (meta.integration?.cardinality === "many" && !federationManyOperations[path.join(".")])
      missing.push(path.join("."));
  });
  expect(missing).toEqual([]);
});
