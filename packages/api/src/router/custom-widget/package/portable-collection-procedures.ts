import { z } from "zod/v4";

import { widgetCollectionKeySchema, widgetCollectionManifestSchema } from "@homarr/custom-widgets/package";

import { widgetPackageAdminProcedure } from "./procedure";
import { getWidgetCollection, listWidgetCollections } from "./portable-collection-records";
import { exportWidgetCollection, importWidgetCollection } from "./portable-collection-transfer";
import { setWidgetCollectionBindings } from "./portable-collection-bindings";

const admin = widgetPackageAdminProcedure;
export const packagePortableCollectionProcedures = {
  collections: admin.query(({ ctx }) => listWidgetCollections(ctx)),
  collection: admin
    .input(z.object({ importId: z.string().min(1) }))
    .query(({ ctx, input }) => getWidgetCollection(ctx, input.importId)),
  importCollection: admin
    .input(
      z.object({
        archive: z.unknown(),
        bindings: z.record(widgetCollectionKeySchema, z.string().min(1)).default({}),
      }),
    )
    .mutation(({ ctx, input }) => importWidgetCollection(ctx, input.archive, input.bindings)),
  setCollectionBindings: admin
    .input(
      z.object({
        importId: z.string().min(1),
        bindings: z.record(widgetCollectionKeySchema, z.string().min(1)),
      }),
    )
    .mutation(({ ctx, input }) => setWidgetCollectionBindings(ctx, input.importId, input.bindings)),
  exportCollection: admin
    .input(
      z.object({
        manifest: widgetCollectionManifestSchema,
        installationIds: z
          .array(z.string().min(1))
          .min(1)
          .max(32)
          .refine((ids) => new Set(ids).size === ids.length, "Choose each installation only once"),
      }),
    )
    .query(({ ctx, input }) => exportWidgetCollection(ctx, input.manifest, input.installationIds)),
};
