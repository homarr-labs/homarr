import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const assetName = "homarr-discord-announcement.json";
const pendingLabel = "discord-announcement:pending";
const sentLabel = "discord-announcement:sent";

const createContext = ({ env = process.env, runGh, post = fetch } = {}) => {
  const repository = env.GITHUB_REPOSITORY;
  const tag = env.NEXT_VERSION;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) throw new Error("Invalid GITHUB_REPOSITORY");
  if (!/^v\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(tag ?? "")) throw new Error("Invalid NEXT_VERSION");

  const gh = async (args) => {
    try {
      if (runGh) return await runGh(args);
      const { stdout } = await execFileAsync("gh", args, { env, timeout: 60_000, maxBuffer: 2 * 1024 * 1024 });
      return stdout;
    } catch {
      throw new Error("GitHub release-state operation failed");
    }
  };
  const api = async (args) => JSON.parse(await gh(["api", ...args]));
  const readRelease = async () => {
    const release = await api([`repos/${repository}/releases/tags/${tag}`]);
    if (
      !Number.isSafeInteger(release.id) ||
      release.id <= 0 ||
      release.tag_name !== tag ||
      typeof release.draft !== "boolean" ||
      typeof release.prerelease !== "boolean"
    ) {
      throw new Error("Unexpected GitHub release");
    }
    return release;
  };
  const readState = async (release) => {
    const pages = await api([
      "--paginate",
      "--slurp",
      `repos/${repository}/releases/${release.id}/assets?per_page=100`,
    ]);
    const asset = pages.flat().find((candidate) => candidate.name === assetName);
    if (!asset) return null;
    if (
      !Number.isSafeInteger(asset.id) ||
      asset.id <= 0 ||
      asset.state !== "uploaded" ||
      !Number.isSafeInteger(asset.size) ||
      asset.size < 1 ||
      asset.size > 1024 ||
      (asset.label !== pendingLabel && asset.label !== sentLabel)
    ) {
      throw new Error("Invalid Discord announcement marker");
    }
    const intent = await api([
      `repos/${repository}/releases/assets/${asset.id}`,
      "-H",
      "Accept: application/octet-stream",
    ]);
    if (intent.schemaVersion !== 1 || intent.releaseId !== release.id || intent.tag !== tag) {
      throw new Error("Discord announcement marker does not match this release");
    }
    return asset;
  };
  return { env, repository, tag, gh, api, readRelease, readState, post };
};

export const publishRelease = async (options) => {
  const context = createContext(options);
  const { env, repository, tag, gh, readRelease, readState } = context;
  const release = await readRelease();

  // The immutable intent survives notes regeneration; only its label changes after delivery.
  if (release.draft && !release.prerelease && env.GITHUB_REF_NAME === "main" && env.DISCORD_RELEASES_WEBHOOK) {
    const state = await readState(release);
    if (!state) {
      const directory = await mkdtemp(join(tmpdir(), "homarr-discord-intent-"));
      try {
        const file = join(directory, assetName);
        await writeFile(file, JSON.stringify({ schemaVersion: 1, releaseId: release.id, tag }));
        await gh(["release", "upload", tag, `${file}#${pendingLabel}`, "--repo", repository]);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
      const persisted = await readState(release);
      if (persisted?.label !== pendingLabel) throw new Error("Discord announcement intent was not persisted");
    }
  }

  if (release.draft) await gh(["release", "edit", tag, "--repo", repository, "--draft=false"]);
};

const embedPayload = (value, tag, url) => {
  let release;
  try {
    release = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof release?.summary !== "string" || !Array.isArray(release.highlights)) return null;
  const highlights = release.highlights.filter((highlight) => typeof highlight === "string");
  let title = `Homarr ${tag}`;
  if (typeof release.title === "string" && release.title.length > 0) title = release.title;
  const embed = {
    title: title.slice(0, 256),
    url,
    description: `${release.summary}\n\n${highlights.map((highlight) => `• ${highlight}`).join("\n")}`.slice(0, 4000),
    color: 16405074,
    footer: { text: tag },
  };
  if (typeof release.imageUrl === "string" && release.imageUrl.length > 0) embed.image = { url: release.imageUrl };
  return { embeds: [embed] };
};

export const announceRelease = async (options = {}) => {
  const env = options.env ?? process.env;
  if (env.GITHUB_REF_NAME !== "main" || !env.DISCORD_RELEASES_WEBHOOK) return { status: "disabled" };
  const context = createContext(options);
  const { repository, tag, api, readRelease, readState, post } = context;
  const release = await readRelease();
  if (release.draft || release.prerelease) return { status: "unpublished-stable" };
  const state = await readState(release);
  if (!state) return { status: "no-intent" };
  if (state.label === sentLabel) return { status: "sent" };

  let webhook;
  try {
    webhook = new URL(env.DISCORD_RELEASES_WEBHOOK);
    webhook.searchParams.set("wait", "true");
  } catch {
    throw new Error("DISCORD_RELEASES_WEBHOOK is not a valid URL");
  }
  const url = `https://github.com/${repository}/releases/tag/${tag}`;
  const plain = { content: `Homarr ${tag} is out: ${url}` };
  const embed = embedPayload(env.DISCORD_RELEASE, tag, url);
  const payloads = [];
  if (embed) payloads.push(embed);
  payloads.push(plain);

  for (const payload of payloads) {
    let response;
    try {
      response = await post(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
    } catch {
      // A lost response may follow delivery. Keep the intent, without logging the secret URL.
      throw new Error("Discord delivery was not confirmed; check Discord before retrying the pending announcement");
    }
    if (!response.ok) continue;

    // PATCH preserves the intent asset: there is no delete/reupload window for this transition.
    let persisted;
    try {
      persisted = await api([
        "--method",
        "PATCH",
        `repos/${repository}/releases/assets/${state.id}`,
        "-f",
        `label=${sentLabel}`,
      ]);
    } catch {
      throw new Error("Discord confirmed delivery but its sent marker failed; check Discord before retrying");
    }
    if (persisted.id !== state.id || persisted.label !== sentLabel) {
      throw new Error("Discord delivery succeeded but its sent marker was not confirmed");
    }
    return { status: "sent" };
  }

  throw new Error("Discord did not accept the announcement; the announcement remains pending");
};

const main = async () => {
  const phase = process.argv[2];
  if (phase === "publish") return publishRelease();
  if (phase === "announce") return announceRelease();
  throw new Error("Usage: node scripts/release-notes/announcement.mjs <publish|announce>");
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
