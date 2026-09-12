import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { command, number, positional, string } from "@drizzle-team/brocli";

import { customWidgetArchiveSchema } from "@homarr/custom-widgets/package";

export const widgetPublishCommand = command({
  name: "publish",
  desc: "Publish the exact packed archive as an immutable authenticated Workshop release",
  options: {
    file: positional("archive").required().desc("Packed homarr-widget archive JSON"),
    url: string("url").desc("Workshop API URL; defaults to WORKSHOP_API_URL or https://homarr.dev"),
    tokenEnv: string("token-env").default("HOMARR_WORKSHOP_TOKEN").desc("Variable holding a Workshop account token"),
    submissionId: string("submission-id").desc("Owned Workshop listing to update; omit for a new package"),
    revision: number("expected-revision").int().min(1).desc("Current listing revision, required for updates"),
    forkedFrom: string("forked-from").desc("Original immutable release ID when publishing a fork"),
    changelog: string("changelog").desc("Release changes (up to 2000 characters)"),
  },
  handler: async ({ file, url, tokenEnv, submissionId, revision, forkedFrom, changelog }) => {
    const archive = customWidgetArchiveSchema.parse(JSON.parse(await readFile(resolve(file), "utf8")));
    const { assertWidgetArtifactIntegrity } = await import("@homarr/custom-widgets/package/server");
    assertWidgetArtifactIntegrity(archive.artifact, archive.source);
    const token = process.env[tokenEnv];
    if (!token) throw new Error(`Set ${tokenEnv} to a Workshop account token before publishing`);
    if (submissionId && !revision) throw new Error("Updating a listing requires --expected-revision");
    const base = new URL(url ?? process.env.WORKSHOP_API_URL ?? "https://homarr.dev");
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password)
      throw new Error("Use an HTTP(S) Workshop URL without embedded credentials");
    const response = await fetch(new URL("api/workshop/package-releases", `${base.href.replace(/\/$/u, "")}/`), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
      headers: { authorization: token, "content-type": "application/json" },
      body: JSON.stringify({ ...archive, submissionId, expectedRevision: revision, forkedFrom, changelog }),
    });
    if (!response.ok)
      throw new Error(
        `Workshop rejected the release (HTTP ${response.status}); check account ownership, revision and version`,
      );
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string")
      throw new Error("Workshop returned an invalid release");
    console.log(`Published ${archive.source.manifest.id}@${archive.source.manifest.version}, release ${result.id}`);
  },
});
