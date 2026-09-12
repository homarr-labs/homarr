import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { boolean, command, positional, string } from "@drizzle-team/brocli";
import { createTRPCClient, httpLink } from "@trpc/client";
import superjson from "superjson";

import type { AppRouter } from "@homarr/api";

interface ProjectConnection {
  url: string;
  installationId: string;
  previewId?: string;
}

export const widgetPreviewCommand = command({
  name: "preview",
  desc: "Preview local source using an installed Homarr and its owner-bound connections",
  options: {
    file: positional("path").required().desc("Widget project directory or package JSON"),
    url: string("url").desc("Homarr URL; defaults to HOMARR_URL"),
    keyEnv: string("api-key-env").default("HOMARR_API_KEY").desc("Variable holding an admin Homarr API key"),
    installationId: string("installation-id").desc(
      "Existing local installation; otherwise reuse this project's preview installation",
    ),
    bindings: string("bindings").desc("JSON file mapping named connections to Homarr connection IDs"),
    options: string("options").desc("JSON file containing preview option values"),
    scenario: string("scenario").desc("Named synthetic preview scenario declared in the package"),
    trust: boolean("trust").desc("Trust this source to execute with Homarr's privileges"),
    liveActions: boolean("live-actions").desc("Enable real actions in this preview session"),
    saveDraft: boolean("save-draft").desc("Also replace the selected installation's saved source draft"),
  },
  handler: async ({
    file,
    url,
    keyEnv,
    installationId,
    bindings,
    options,
    scenario,
    trust,
    liveActions,
    saveDraft,
  }) => {
    if (trust !== true) throw new Error("Pass --trust to preview this code with Homarr's privileges");
    const base = new URL(url ?? process.env.HOMARR_URL ?? "http://localhost:7575");
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password)
      throw new Error("Use an HTTP(S) Homarr URL without embedded credentials");
    const apiKey = process.env[keyEnv];
    if (!apiKey) throw new Error(`Set ${keyEnv} to an admin API key from your Homarr instance`);
    const { loadCustomWidgetProject } = await import("@homarr/custom-widgets/package/server");
    const project = await loadCustomWidgetProject(file);
    const statePath = join(project.projectDirectory, ".homarr-widget.local.json");
    const previous = await readProjectConnection(statePath);
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
    let id = installationId;
    if (!id && previous?.url === base.href) id = previous.installationId;
    if (!id || saveDraft)
      id = (
        await client.customWidget.package.saveDraft.mutate({
          id,
          name: project.source.manifest.name,
          source: project.source,
        })
      ).id;
    const preview = await client.customWidget.package.preview.mutate({
      id,
      source: project.source,
      trusted: true,
      liveActions: liveActions === true,
      bindings: await readJsonRecord<string>(bindings),
      options: await readJsonRecord(options),
      scenario,
    });
    await writeFile(statePath, JSON.stringify({ url: base.href, installationId: id, previewId: preview.previewId }), {
      mode: 0o600,
    });
    if (previous?.previewId && previous.url === base.href)
      await client.customWidget.package.discardPreview.mutate({ previewId: previous.previewId }).catch(() => undefined);
    console.log(
      `Preview: ${new URL(`manage/custom-widgets/packages/preview/${preview.previewId}`, `${base.href.replace(/\/$/u, "")}/`).href}`,
    );
    console.log(`Installation: ${id}. Open the preview while signed in as the API key's owner.`);
  },
});

async function readProjectConnection(path: string): Promise<ProjectConnection | null> {
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (
      value &&
      typeof value === "object" &&
      "url" in value &&
      "installationId" in value &&
      typeof value.url === "string" &&
      typeof value.installationId === "string"
    )
      return value as ProjectConnection;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  return null;
}

async function readJsonRecord<T = unknown>(path?: string): Promise<Record<string, T>> {
  if (!path) return {};
  const value: unknown = JSON.parse(await readFile(resolve(path), "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Preview bindings/options must be JSON objects");
  return value as Record<string, T>;
}
