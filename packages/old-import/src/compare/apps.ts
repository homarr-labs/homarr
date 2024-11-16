import type { InferInsertModel } from "@homarr/db";
import type { apps } from "@homarr/db/schema/sqlite";

export const doAppsMatch = (
  appA: Omit<InferInsertModel<typeof apps>, "id">,
  appB: Omit<InferInsertModel<typeof apps>, "id">,
) =>
  appA.href === appB.href &&
  appA.name === appB.name &&
  appA.iconUrl === appB.iconUrl &&
  appA.description === appB.description;
