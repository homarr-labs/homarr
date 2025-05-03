import type { X509Certificate } from "node:crypto";

import type {
  AnyTestConnectionError,
  TestConnectionErrorDataOfType,
  TestConnectionErrorType,
} from "@homarr/integrations/test-connection";

export interface MappedError {
  name: string;
  message: string;
  metadata: { key: string; value: string | number | boolean }[];
  cause?: MappedError;
}

const ignoredErrorProperties = ["name", "message", "cause", "stack"];
const mapError = (error: Error): MappedError => {
  const metadata = Object.entries(error)
    .filter(([key]) => !ignoredErrorProperties.includes(key))
    .map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return { key, value };
      }
      return null;
    })
    .filter((value) => value !== null);
  return {
    name: error.name,
    message: error.message,
    metadata,
    cause: error.cause && error.cause instanceof Error ? mapError(error.cause) : undefined,
  };
};

export interface MappedCertificate {
  issuer?: MappedCertificate;
  subject: {
    commonName?: string;
    organizationName?: string;
    countryCode?: string;
    city?: string;
  };
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  fingerprint: string;
  pem: string;
}

const mapSubjectProperties = (subject: string): MappedCertificate["subject"] => {
  const keyValuePairs = subject
    .split("\n")
    .map((row) => row.split("="))
    .filter((row) => row.length === 2) as [string, string][];
  return {
    commonName: keyValuePairs.find(([key]) => key === "CN")?.at(1),
    organizationName: keyValuePairs.find(([key]) => key === "O")?.at(1),
    countryCode: keyValuePairs.find(([key]) => key === "C")?.at(1),
    city: keyValuePairs.find(([key]) => key === "L")?.at(1),
  };
};

const mapCertificate = (certificate: X509Certificate): MappedCertificate => ({
  issuer: certificate.issuerCertificate ? mapCertificate(certificate.issuerCertificate) : undefined,
  subject: mapSubjectProperties(certificate.subject),
  serialNumber: certificate.serialNumber,
  validFrom: certificate.validFromDate,
  validTo: certificate.validToDate,
  fingerprint: certificate.fingerprint256,
  pem: certificate.toString(),
});

type MappedData<TType extends TestConnectionErrorType> = TType extends "unknown" | "parse"
  ? undefined
  : TType extends "certificate"
    ? {
        type: TestConnectionErrorDataOfType<TType>["requestError"]["type"];
        reason: TestConnectionErrorDataOfType<TType>["requestError"]["reason"];
        certificate: MappedCertificate;
      }
    : TType extends "request"
      ? {
          type: TestConnectionErrorDataOfType<TType>["requestError"]["type"];
          reason: TestConnectionErrorDataOfType<TType>["requestError"]["reason"];
        }
      : TType extends "authorization"
        ? {
            statusCode: TestConnectionErrorDataOfType<TType>["statusCode"];
            reason: TestConnectionErrorDataOfType<TType>["reason"];
          }
        : TType extends "statusCode"
          ? {
              statusCode: TestConnectionErrorDataOfType<TType>["statusCode"];
              reason: TestConnectionErrorDataOfType<TType>["reason"];
              url: TestConnectionErrorDataOfType<TType>["url"];
            }
          : never;

type AnyMappedData = {
  [TType in TestConnectionErrorType]: MappedData<TType>;
}[TestConnectionErrorType];

const mapData = (error: AnyTestConnectionError): AnyMappedData => {
  if (error.type === "unknown") return undefined;
  if (error.type === "parse") return undefined;
  if (error.type === "certificate") {
    return {
      type: error.data.requestError.type,
      reason: error.data.requestError.reason,
      certificate: mapCertificate(error.data.certificate),
    };
  }
  if (error.type === "request") {
    return {
      type: error.data.requestError.type,
      reason: error.data.requestError.reason,
    };
  }
  if (error.type === "authorization") {
    return {
      statusCode: error.data.statusCode,
      reason: error.data.reason,
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (error.type === "statusCode") {
    return {
      statusCode: error.data.statusCode,
      reason: error.data.reason,
      url: error.data.url,
    };
  }

  throw new Error(`Unsupported error type: ${(error as AnyTestConnectionError).type}`);
};

interface MappedTestConnectionError<TType extends TestConnectionErrorType> {
  type: TType;
  name: string;
  message: string;
  data: MappedData<TType>;
  cause?: MappedError;
}
export type AnyMappedTestConnectionError = {
  [TType in TestConnectionErrorType]: MappedTestConnectionError<TType>;
}[TestConnectionErrorType];

export const mapTestConnectionError = (error: AnyTestConnectionError) => {
  return {
    type: error.type,
    name: error.name,
    message: error.message,
    data: mapData(error),
    cause: error.cause ? mapError(error.cause) : undefined,
  } as AnyMappedTestConnectionError;
};
