import { execFileSync } from "node:child_process";

export interface InspectedImage {
  Id: string;
  Architecture: string;
  Os: string;
  RepoDigests?: string[];
  Config?: { Labels?: Record<string, string> };
}

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Missing BuildKit source provenance");
  return value as Record<string, unknown>;
};

export function extractBuildKitRevision(provenance: unknown, platform: string): string {
  let node: Record<string, unknown> = record(provenance);
  for (const key of [platform, "SLSA", "buildDefinition", "externalParameters", "request", "root", "request", "args"])
    node = record(node[key]);
  if (node["vcs:source"] !== "https://github.com/homarr-labs/homarr")
    throw new Error("Image provenance identifies a different repository");
  const revision = node["vcs:revision"];
  if (typeof revision !== "string" || !/^[a-f0-9]{40}$/.test(revision))
    throw new Error("Image provenance has no exact source revision");
  return revision;
}

export function verifyImageSource(inspected: InspectedImage, expectedSource: string) {
  if (inspected.Os !== "linux" || inspected.Architecture !== "amd64")
    throw new Error("Initial image sanity environment requires linux/amd64");
  const repositoryDigest = inspected.RepoDigests?.find((digest) =>
    /^ghcr\.io\/homarr-labs\/homarr@sha256:[a-f0-9]{64}$/.test(digest),
  );
  const revision = inspected.Config?.Labels?.["org.opencontainers.image.revision"];
  if (revision === expectedSource)
    return { digest: repositoryDigest?.split("@")[1] ?? inspected.Id, source: "oci-label" as const };
  if (!repositoryDigest)
    throw new Error("Mismatched image label and no immutable repository digest for provenance verification");
  // Historical release labels predate the version commit. Read the build's source from
  // the inspected immutable image's registry attestation, never a caller-supplied override.
  const serialized = execFileSync(
    "docker",
    ["buildx", "imagetools", "inspect", repositoryDigest, "--format", "{{json .Provenance}}"],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  const actualSource = extractBuildKitRevision(JSON.parse(serialized), "linux/amd64");
  if (actualSource !== expectedSource)
    throw new Error(`Immutable image provenance revision ${actualSource} does not match ${expectedSource}`);
  return { digest: repositoryDigest.split("@")[1] ?? inspected.Id, source: "buildkit-attestation" as const };
}
