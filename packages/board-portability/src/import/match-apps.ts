import type { InferSelectModel } from "@homarr/db";
import type { apps } from "@homarr/db/schema";

export const doAppsMatch = (
  app1: Omit<InferSelectModel<typeof apps>, "id">,
  app2: Omit<InferSelectModel<typeof apps>, "id">,
) => {
  return (
    app1.name === app2.name &&
    app1.iconUrl === app2.iconUrl &&
    app1.description === app2.description &&
    app1.href === app2.href
  );
};
