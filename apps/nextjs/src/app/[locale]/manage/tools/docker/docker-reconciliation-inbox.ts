import type { DockerServiceMatch, DockerServicePort, UrlTemplateMode } from "@homarr/definitions";
import { buildAppUrl, buildIntegrationUrl, getIntegrationDefaultPort } from "@homarr/definitions";

export type DockerReconciliationInboxFilter = "attention" | "represented" | "all";

interface DockerReconciliationInboxCandidate {
  candidateKey: string;
  state: "newRecognized" | "newApp" | "represented" | "linked" | "moved";
}

const attentionStates = new Set<DockerReconciliationInboxCandidate["state"]>(["newRecognized", "newApp", "moved"]);

export const filterDockerReconciliationInbox = <Candidate extends DockerReconciliationInboxCandidate>(
  candidates: Candidate[],
  filter: DockerReconciliationInboxFilter,
  dismissedCandidateKeys: string[],
) => {
  const dismissed = new Set(dismissedCandidateKeys);
  return candidates.filter((candidate) => {
    if (dismissed.has(candidate.candidateKey)) return false;
    if (filter === "attention") return attentionStates.has(candidate.state);
    if (filter === "represented") return candidate.state === "represented" || candidate.state === "linked";
    return true;
  });
};

export const dismissDockerReconciliationCandidate = (dismissedCandidateKeys: string[], candidateKey: string) =>
  dismissedCandidateKeys.includes(candidateKey) ? dismissedCandidateKeys : [...dismissedCandidateKeys, candidateKey];

interface DockerTemplateCandidate {
  container: {
    name: string;
    ports?: DockerServicePort[];
  };
  match: Pick<DockerServiceMatch, "kind"> | null;
}

export const getTemplateUrl = (candidate: DockerTemplateCandidate, serverOrigin: string, urlMode: UrlTemplateMode) => {
  if (!serverOrigin.trim()) return "";

  const tcpPorts = candidate.container.ports?.filter(({ Type }) => Type.toLowerCase() === "tcp") ?? [];
  let publishedPort = tcpPorts.find(({ PublicPort }) => PublicPort)?.PublicPort;

  if (candidate.match) {
    const defaultPort = getIntegrationDefaultPort(candidate.match.kind);
    const preferredPort = tcpPorts.find(
      ({ PrivatePort, PublicPort }) => PrivatePort === defaultPort && PublicPort !== undefined,
    );
    publishedPort = preferredPort?.PublicPort ?? publishedPort;
    return buildIntegrationUrl(candidate.match.kind, serverOrigin, urlMode, publishedPort);
  }

  return buildAppUrl(candidate.container.name, serverOrigin, urlMode, publishedPort);
};
