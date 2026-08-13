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

export const getValidDockerServiceUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};
