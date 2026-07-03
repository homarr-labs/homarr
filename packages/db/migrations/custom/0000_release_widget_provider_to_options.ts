import SuperJSON from "superjson";

import { createId } from "@homarr/common";
import { releaseProviderKinds } from "@homarr/definitions";

import { eq } from "../..";
import type { Database } from "../..";
import { items } from "../../schema";

export async function migrateReleaseWidgetProviderToOptionsAsync(db: Database) {
  const existingItems = await db.query.items.findMany({
    where: (items, { eq }) => eq(items.kind, "releases"),
  });

  const updates: {
    id: string;
    options: object;
  }[] = [];
  for (const item of existingItems) {
    const options = SuperJSON.parse<object>(item.options);
    if (!("repositories" in options)) continue;
    if (!Array.isArray(options.repositories)) continue;
    if (options.repositories.length === 0) continue;
    if (!options.repositories.some((repository) => "providerKey" in repository)) continue;

    const updatedRepositories = options.repositories
      .map(({ providerKey, ...otherFields }: { providerKey: string; [key: string]: unknown }) => {
        const provider = providerKey.charAt(0).toLowerCase() + providerKey.slice(1);
        const matchedProvider = releaseProviderKinds.find((kind) => kind === provider);
        if (!matchedProvider) return null;

        return {
          id: createId(),
          provider: matchedProvider,
          ...otherFields,
        };
      })
      .filter((repo) => repo !== null);

    updates.push({
      id: item.id,
      options: {
        ...options,
        repositories: updatedRepositories,
      },
    });
  }

  for (const update of updates) {
    await db
      .update(items)
      .set({
        options: SuperJSON.stringify(update.options),
      })
      .where(eq(items.id, update.id));
  }

  console.log(`Migrated release widget providers to options count="${updates.length}"`);
}
