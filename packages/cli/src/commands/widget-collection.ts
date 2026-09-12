import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { command, positional, string } from "@drizzle-team/brocli";
import { createTRPCClient, httpLink } from "@trpc/client";
import superjson from "superjson";
import { z } from "zod/v4";

import type { AppRouter } from "@homarr/api";
import {
  customWidgetArchiveSchema,
  widgetCollectionConnectionsSchema,
  widgetCollectionEntrySchema,
  widgetCollectionKeySchema,
  widgetCollectionManifestSchema,
  WIDGET_COLLECTION_MAX_BYTES,
} from "@homarr/custom-widgets/package";

const archiveInput = () => ({ file: positional("path").required().desc("Collection archive JSON") });
const projectSchema = z.strictObject({
  manifest: widgetCollectionManifestSchema,
  connections: widgetCollectionConnectionsSchema.default({}),
  widgets: z
    .array(widgetCollectionEntrySchema.omit({ archive: true }).extend({ archive: z.string().min(1) }))
    .min(1)
    .max(32),
});

async function readJson(path: string): Promise<unknown> {
  if ((await stat(path)).size > WIDGET_COLLECTION_MAX_BYTES) throw new Error("Collection input exceeds 128 MiB");
  return JSON.parse(await readFile(path, "utf8"));
}

const pack = command({
  name: "pack",
  desc: "Combine compiled widget archives and shared connection requirements without executing code",
  options: {
    file: positional("path").required().desc("Collection manifest JSON with member archive file paths"),
    output: string("output").alias("o").required().desc("New output collection archive JSON"),
  },
  handler: async ({ file, output }) => {
    const { createWidgetCollectionArchive } = await import("@homarr/custom-widgets/package/server");
    const path = resolve(file);
    const project = projectSchema.parse(await readJson(path));
    const widgets = [];
    let totalBytes = (await stat(path)).size;
    for (const entry of project.widgets) {
      try {
        const memberPath = resolve(dirname(path), entry.archive);
        totalBytes += (await stat(memberPath)).size;
        if (totalBytes > WIDGET_COLLECTION_MAX_BYTES) throw new Error("Combined collection inputs exceed 128 MiB");
        const archive = customWidgetArchiveSchema.parse(await readJson(memberPath));
        widgets.push({ ...entry, archive });
      } catch (error) {
        throw new Error(`Widget '${entry.key}': ${error instanceof Error ? error.message : "Invalid archive"}`, {
          cause: error,
        });
      }
    }
    const archive = createWidgetCollectionArchive({ ...project, format: "homarr-widget-collection-v1", widgets });
    const target = resolve(output);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(archive, null, 2), { flag: "wx", mode: 0o600 });
    console.log(`Packed ${archive.widgets.length} widgets: ${target}`);
  },
});

const validate = command({
  name: "validate",
  desc: "Check collection structure, connection mapping and every artifact checksum",
  options: archiveInput(),
  handler: async ({ file }) => {
    const { loadWidgetCollectionArchive } = await import("@homarr/custom-widgets/package/server");
    const archive = await loadWidgetCollectionArchive(resolve(file));
    console.log(
      `Valid collection: ${archive.manifest.id}@${archive.manifest.version} (${archive.widgets.length} widgets)`,
    );
  },
});

const install = command({
  name: "import",
  desc: "Import every collection member as a disabled draft in an installed Homarr",
  options: {
    ...archiveInput(),
    url: string("url").desc("Homarr URL; defaults to HOMARR_URL"),
    keyEnv: string("api-key-env")
      .default("HOMARR_API_KEY")
      .desc("Environment variable containing an admin Homarr API key"),
    bindings: string("bindings").desc(
      "Local JSON mapping collection connection slots to existing Homarr connection IDs",
    ),
  },
  handler: async ({ file, url, keyEnv, bindings }) => {
    const base = new URL(url ?? process.env.HOMARR_URL ?? "http://localhost:7575");
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password)
      throw new Error("Use an HTTP(S) Homarr URL without embedded credentials");
    const apiKey = process.env[keyEnv];
    if (!apiKey) throw new Error(`Set ${keyEnv} to an admin API key from your Homarr instance`);
    const { loadWidgetCollectionArchive } = await import("@homarr/custom-widgets/package/server");
    const archive = await loadWidgetCollectionArchive(resolve(file));
    const mapping = z
      .record(widgetCollectionKeySchema, z.string().min(1))
      .parse(bindings ? await readJson(resolve(bindings)) : {});
    const client = createTRPCClient<AppRouter>({
      links: [
        httpLink({
          url: new URL("api/trpc", `${base.href.replace(/\/$/u, "")}/`).href,
          transformer: superjson,
          headers: { ApiKey: apiKey },
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              redirect: "error",
              signal: AbortSignal.any([AbortSignal.timeout(300_000), ...(init?.signal ? [init.signal] : [])]),
            }),
        }),
      ],
    });
    const installed = await client.customWidget.package.importCollection.mutate({ archive, bindings: mapping });
    console.log(`Imported ${installed.entries.length} disabled widgets. Collection import: ${installed.importId}`);
    for (const entry of installed.entries)
      console.log(
        `${entry.key}: ${new URL(entry.managementPath.replace(/^\//u, ""), `${base.href.replace(/\/$/u, "")}/`).href}`,
      );
    console.log("Review each package and explicitly trust it before previewing or activating it.");
  },
});

export const widgetCollectionCommand = command({
  name: "collection",
  desc: "Package and import several independent dashboard widgets with shared local connections",
  subcommands: [pack, validate, install],
});
