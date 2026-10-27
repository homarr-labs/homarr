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

export function verifyImageSource(inspected: InspectedImage, expectedSource: string, requestedImage: string) {
  if (inspected.Os !== "linux" || inspected.Architecture !== "amd64")
    throw new Error("Initial image sanity environment requires linux/amd64");
  let repositoryDigest: string | undefined;
  const registryTarget = requestedImage.match(
    /^(ghcr\.io\/homarr-labs\/homarr(?:-test)?)(?::[^@]+)?(?:@(sha256:[a-f0-9]{64}))?$/,
  );
  if (registryTarget) {
    const repository = registryTarget[1];
    const requestedDigest = registryTarget[2];
    if (requestedDigest) {
      repositoryDigest = `${repository}@${requestedDigest}`;
      if (!inspected.RepoDigests?.includes(repositoryDigest))
        throw new Error("Requested image digest does not match the inspected image");
    } else {
      const candidates = inspected.RepoDigests?.filter((digest) => digest.startsWith(`${repository}@sha256:`)) ?? [];
      if (candidates.length !== 1)
        throw new Error("Registry image needs one exact inspected repository digest; supply an immutable digest");
      repositoryDigest = candidates[0];
    }
  } else if (requestedImage.includes("/") || requestedImage.includes("@")) {
    throw new Error("Unsupported registry image; use the Homarr release or PR image repository");
  }
  let digest = inspected.Id;
  if (repositoryDigest) digest = repositoryDigest.slice(repositoryDigest.indexOf("@") + 1);
  const revision = inspected.Config?.Labels?.["org.opencontainers.image.revision"];
  if (revision === expectedSource) return { digest, source: "oci-label" as const };
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
  return { digest, source: "buildkit-attestation" as const };
}
