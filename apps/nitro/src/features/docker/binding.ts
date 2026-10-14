import type { BackendPrincipal } from "@homarr/api/nitro/context";
import type { ByteUnitSystem } from "@homarr/common/number";
import type { UrlTemplateMode } from "@homarr/definitions";
import type { MRT_Localization } from "mantine-react-table";

import type { DockerCandidate, DockerContainer, DockerFeatureClient } from "./client";

export const dockerFeatureHolds = [
  "Private route admission, current real principal and owned Docker-enabled/read-only configuration are not bound.",
  "No physical oRPC Docker transport or application provider binding is installed by this feature.",
  "Native log initialization, request abort, iterator return and host disposal require owned cleanup binding and review.",
  "Nitro workspace, Mantine table and xterm dependency declarations still require admission.",
] as const;

export interface DockerFeatureNavigation {
  addApps?: (containers: DockerContainer[], initialUrls?: (string | null)[]) => void;
  setupIntegration?: (candidate: DockerCandidate, url: string) => void;
  reviewIntegration?: (candidate: DockerCandidate) => void;
  viewRepresentation?: (candidate: DockerCandidate) => void;
}

export interface DockerFeatureBinding {
  client: DockerFeatureClient;
  principal: Extract<BackendPrincipal, { kind: "authenticated" }>;
  authorityKey: string;
  enabled: boolean;
  readOnly: boolean;
  logStreaming: { kind: "held"; reason: string } | { kind: "admitted" };
  navigation: DockerFeatureNavigation;
  byteUnit: ByteUnitSystem;
  tableLocalization: MRT_Localization;
  defaultServerOrigin: string;
  defaultUrlMode: UrlTemplateMode;
}

export type DockerFeatureAdmission =
  | { kind: "held"; reasons: readonly string[] }
  | { kind: "admitted"; binding: DockerFeatureBinding };

export const heldDockerFeatureAdmission: DockerFeatureAdmission = { kind: "held", reasons: dockerFeatureHolds };

export function getDockerFeatureScope(binding: DockerFeatureBinding) {
  return [
    "native",
    binding.authorityKey,
    binding.principal.user.id,
    "docker",
    binding.principal.user.permissions.toSorted(),
    binding.readOnly,
  ] as const;
}
