import type { RouterOutputs } from "@homarr/api";

export type AnyMappedTestConnectionError = Extract<RouterOutputs["integration"]["create"], { error: unknown }>["error"];
export type MappedTestConnectionCertificateError = Extract<AnyMappedTestConnectionError, { type: "certificate" }>;
export type MappedCertificate = MappedTestConnectionCertificateError["data"]["certificate"];
export type MappedError = Exclude<AnyMappedTestConnectionError["cause"], undefined>;
