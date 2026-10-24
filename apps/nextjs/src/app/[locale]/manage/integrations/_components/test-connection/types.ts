import type { AnyMappedTestConnectionError } from "@homarr/api";

export type { AnyMappedTestConnectionError };
export type MappedTestConnectionCertificateError = Extract<AnyMappedTestConnectionError, { type: "certificate" }>;
export type MappedCertificate = MappedTestConnectionCertificateError["data"]["certificate"];
export type MappedError = Exclude<AnyMappedTestConnectionError["cause"], undefined>;
