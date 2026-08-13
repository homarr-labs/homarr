import {
  extractContainerImageName,
  matchIntegrationKind,
  matchIntegrationKindFromContainer,
} from "./docker-integration-match";
import type { IntegrationKind } from "./integration";

export type DockerServiceMatchConfidence = "high" | "medium";
export type DockerServiceMatchSource = "image" | "name";
export type DockerUrlCandidateSource = "publishedAddress" | "endpointHost" | "containerDns" | "manual";
export type DockerUrlCandidateScope = "browser" | "server";
export type DockerUrlCandidateReason =
  | "publishedAddress"
  | "dockerEndpointHost"
  | "sharedContainerNetwork"
  | "manualHostRequired";

export interface DockerServiceMatch {
  kind: IntegrationKind;
  confidence: DockerServiceMatchConfidence;
  source: DockerServiceMatchSource;
}

export interface DockerServicePort {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: string;
}

export interface DockerServiceUrlCandidate {
  id: string;
  url: string;
  rank: number;
  source: DockerUrlCandidateSource;
  scopes: DockerUrlCandidateScope[];
  reason: DockerUrlCandidateReason;
}

export const matchDockerService = (container: { image: string; name: string }): DockerServiceMatch | null => {
  const kind = matchIntegrationKindFromContainer(container);
  if (!kind) return null;

  const imageMatch = matchIntegrationKind(extractContainerImageName(container.image));
  return imageMatch === kind
    ? { kind, confidence: "high", source: "image" }
    : { kind, confidence: "medium", source: "name" };
};

export const buildDockerServiceUrlCandidates = ({
  containerName,
  endpointHost,
  ports,
  preferredPort,
}: {
  containerName: string;
  endpointHost: string;
  ports: DockerServicePort[] | undefined;
  preferredPort?: number;
}): DockerServiceUrlCandidate[] => {
  const candidates: DockerServiceUrlCandidate[] = [];
  const endpointHostname = getEndpointHostname(endpointHost);
  const tcpPorts = (ports ?? [])
    .filter((port) => port.Type.toLowerCase() === "tcp")
    .toSorted(
      (left, right) => Number(right.PrivatePort === preferredPort) - Number(left.PrivatePort === preferredPort),
    );

  const addCandidate = (candidate: Omit<DockerServiceUrlCandidate, "id">) => {
    if (candidates.some(({ url, scopes }) => url === candidate.url && scopes.join() === candidate.scopes.join()))
      return;
    candidates.push({
      ...candidate,
      id: `${candidate.source}:${candidate.scopes.join("-")}:${candidate.url || "manual"}`,
    });
  };

  for (const port of tcpPorts) {
    if (port.PublicPort) {
      const publishedHost = isUsablePublishedAddress(port.IP) ? port.IP : endpointHostname;
      if (publishedHost) {
        addCandidate({
          url: `http://${formatUrlHost(publishedHost)}:${port.PublicPort}`,
          rank: port.PrivatePort === preferredPort ? 1 : 2,
          source: isUsablePublishedAddress(port.IP) ? "publishedAddress" : "endpointHost",
          scopes: ["browser", "server"],
          reason: isUsablePublishedAddress(port.IP) ? "publishedAddress" : "dockerEndpointHost",
        });
      }
    }

    addCandidate({
      url: `http://${containerName}:${port.PrivatePort}`,
      rank: port.PrivatePort === preferredPort ? 3 : 4,
      source: "containerDns",
      scopes: ["server"],
      reason: "sharedContainerNetwork",
    });
  }

  addCandidate({
    url: "",
    rank: 99,
    source: "manual",
    scopes: ["browser"],
    reason: "manualHostRequired",
  });

  return candidates.toSorted((left, right) => left.rank - right.rank);
};

export const normalizeDockerServiceUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase() || null;
  }
};

const isUsablePublishedAddress = (value: string | undefined): value is string =>
  Boolean(value && !["0.0.0.0", "::", "::0"].includes(value));

const getEndpointHostname = (host: string) => {
  if (host === "socket" || host.startsWith("/")) return null;
  try {
    return new URL(`http://${host}`).hostname || null;
  } catch {
    return null;
  }
};

const formatUrlHost = (host: string) => (host.includes(":") && !host.startsWith("[") ? `[${host}]` : host);
