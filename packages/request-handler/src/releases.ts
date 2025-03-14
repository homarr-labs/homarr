import dayjs from "dayjs";
import { z } from "zod";

import { fetchWithTimeout } from "@homarr/common";

import { Providers } from "../../widgets/src/releases/release-providers";
import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

const dockerResponseSchema = z
  .object({
    results: z.array(
      z
        .object({ name: z.string(), last_updated: z.string().transform((value) => new Date(value)) })
        .transform((tag) => ({
          identifier: "",
          tag: tag.name,
          lastUpdated: tag.last_updated,
        })),
    ),
  })
  .transform((resp) => resp.results);

const githubResponseSchema = z.array(
  z
    .object({ tag_name: z.string(), published_at: z.string().transform((value) => new Date(value)) })
    .transform((tag) => ({
      identifier: "",
      tag: tag.tag_name,
      lastUpdated: tag.published_at,
    })),
);

const gitlabResponseSchema = z.array(
  z.object({ name: z.string(), released_at: z.string().transform((value) => new Date(value)) }).transform((tag) => ({
    identifier: "",
    tag: tag.name,
    lastUpdated: tag.released_at,
  })),
);

const npmResponseSchema = z
  .object({
    time: z.record(z.string().transform((value) => new Date(value))).transform((version) =>
      Object.entries(version).map(([key, value]) => ({
        identifier: "",
        tag: key,
        lastUpdated: value,
      })),
    ),
  })
  .transform((resp) => resp.time);

const codebergResponseSchema = z.array(
  z
    .object({ tag_name: z.string(), published_at: z.string().transform((value) => new Date(value)) })
    .transform((tag) => ({
      identifier: "",
      tag: tag.tag_name,
      lastUpdated: tag.published_at,
    })),
);

const _responseSchema = z.object({ identifier: z.string(), tag: z.string(), lastUpdated: z.date() });

function getDockerUrl(identifier: string): string {
  if (identifier.indexOf("/") > 0) {
    const [owner, name] = identifier.split("/");
    if (!owner || !name) {
      return "";
    }
    return `https://hub.docker.com/v2/namespaces/${encodeURIComponent(owner)}/repositories/${encodeURIComponent(name)}/tags?page_size=50`;
  } else {
    return `https://hub.docker.com/v2/repositories/library/${encodeURIComponent(identifier)}/tags?page_size=50`;
  }
}

function getGithubUrl(identifier: string): string {
  return `https://api.github.com/repos/${encodeURIComponent(identifier)}/releases`;
}

function getGitlabUrl(identifier: string): string {
  return `https://gitlab.com/api/v4/projects/${encodeURIComponent(identifier)}/releases`;
}

function getNpmUrl(identifier: string): string {
  return `https://registry.npmjs.org/${encodeURIComponent(identifier)}`;
}

function getCodebergUrl(identifier: string): string {
  const [owner, name] = identifier.split("/");
  if (!owner || !name) {
    return "";
  }
  return `https://codeberg.org/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/releases`;
}

export const releasesRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "releasesApiResult",
  widgetKind: "releases",
  async requestAsync(input: { providerName: string; identifier: string; versionRegex: string | undefined }) {
    let url = "";
    let responseSchema;
    switch (input.providerName) {
      case Providers.Docker.name:
        url = getDockerUrl(input.identifier);
        responseSchema = dockerResponseSchema;
        break;
      case Providers.Github.name:
        url = getGithubUrl(input.identifier);
        responseSchema = githubResponseSchema;
        break;
      case Providers.Gitlab.name:
        url = getGitlabUrl(input.identifier);
        responseSchema = gitlabResponseSchema;
        break;
      case Providers.Npm.name:
        url = getNpmUrl(input.identifier);
        responseSchema = npmResponseSchema;
        break;
      case Providers.Codeberg.name:
        url = getCodebergUrl(input.identifier);
        responseSchema = codebergResponseSchema;
        break;
    }

    if (url === "" || responseSchema === undefined) return undefined;

    const response = await fetchWithTimeout(url);
    const result = responseSchema.safeParse(await response.json());

    if (!result.success) return undefined;

    const latest: ReleaseResponse = result.data
      .filter((result) => (input.versionRegex ? new RegExp(input.versionRegex).test(result.tag) : false))
      .reduce(
        (latest, result) => {
          return result.lastUpdated > latest.lastUpdated ? { ...result, identifier: input.identifier } : latest;
        },
        { identifier: "", tag: "", lastUpdated: new Date(0) },
      );
    return latest;
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});

export type ReleaseResponse = z.infer<typeof _responseSchema>;
