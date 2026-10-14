import type { Database } from "@homarr/db";

import type { AppProcedureResources } from "./resources";

export const getIconForName = (db: Database, resources: AppProcedureResources, name: string) =>
  db.query.icons.findFirst({ where: resources.operators.like(resources.tables.icons.name, `%${name}%`) });
