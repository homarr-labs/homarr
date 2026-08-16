import type { RouterOutputs } from "@homarr/api";

type IntegrationCreateErrorResult = Extract<RouterOutputs["integration"]["create"], { error: unknown }>;

export type AnyMappedTestConnectionError = IntegrationCreateErrorResult["error"];
export type MappedTestConnectionCertificateError = Extract<AnyMappedTestConnectionError, { type: "certificate" }>;
export type MappedCertificate = MappedTestConnectionCertificateError["data"]["certificate"];
export type MappedError = Exclude<AnyMappedTestConnectionError["cause"], undefined>;
