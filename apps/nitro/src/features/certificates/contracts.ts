import type { ReactNode } from "react";

import type { CertificateRpcClient } from "./client";

export interface CertificateDetails {
  readonly isSelfSigned: boolean;
  readonly issuer: string;
  readonly issuerCertificate?: CertificateDetails;
  readonly subject: string;
  readonly serialNumber: string;
  readonly validFrom: Date;
  readonly validTo: Date;
  readonly fingerprint: string;
  readonly pem: string;
}

export interface CertificateConnectionError {
  readonly type: "certificate";
  readonly name: string;
  readonly message: string;
  readonly data: {
    readonly type: "certificate";
    readonly reason: "expired" | "hostnameMismatch" | "notYetValid" | "untrusted";
    readonly certificate: CertificateDetails;
  };
}

export type CertificateWriteAvailability =
  | { readonly kind: "available" }
  | { readonly kind: "unavailable"; readonly reason: string };

export interface CertificateNotification {
  readonly kind: "success" | "failed";
  readonly title: string;
  readonly message: string;
}

export interface CertificateUiScope {
  readonly authorityKey: string;
  readonly permissions: readonly string[];
  readonly signal: AbortSignal;
  readonly client?: CertificateRpcClient;
  readonly writes?: CertificateWriteAvailability;
  readonly notify?: (notification: CertificateNotification) => void;
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string | number>) => string;
  readonly rich: (key: string, tags: Record<string, (chunks: ReactNode) => ReactNode>) => ReactNode;
}

export type CertificateListEntry =
  | {
      readonly kind: "valid";
      readonly fileName: string;
      readonly certificate: Pick<CertificateDetails, "subject" | "validTo">;
    }
  | { readonly kind: "invalid"; readonly fileName: string };

export interface TrustedHostnameEntry {
  readonly hostname: string;
  readonly thumbprint: string;
  readonly subject: string | null;
}

export type CertificateReadView<Entry> =
  | { readonly kind: "loading" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "failed" }
  | {
      readonly kind: "ready";
      readonly authorityKey: string;
      readonly revision: string;
      readonly entries: readonly Entry[];
    };

export function canInspectCertificates(scope: CertificateUiScope) {
  return scope.permissions.includes("admin") && !scope.signal.aborted;
}

export function canWriteCertificates(scope: CertificateUiScope) {
  return canInspectCertificates(scope) && scope.writes?.kind === "available" && scope.client !== undefined;
}
