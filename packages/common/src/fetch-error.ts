import { objectEntries } from "./object";

export const tryParseFetchError = (error: unknown): AnyFetchError | undefined => {
  if (!isTypeErrorWithCode(error)) {
    return undefined;
  }

  return reduceFetchError(error.cause.code, error);
};

export const reduceFetchError = (code: string, cause: Error) => {
  return objectEntries(errorMap).reduce(
    (previous, [key, value]) => {
      if (previous) return previous;

      const errorType = matchErrorCode(code, value);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!errorType) {
        return undefined;
      }

      return new FetchError(key, errorType, { cause });
    },
    undefined as AnyFetchError | undefined,
  );
};

export type AnyFetchError = {
  [key in keyof FetchErrorMap]: FetchError<key>;
}[keyof FetchErrorMap];

export class FetchError<TType extends keyof FetchErrorMap> extends Error {
  public type: TType;
  public reason: keyof FetchErrorMap[TType];

  constructor(type: TType, reason: keyof FetchErrorMap[TType], options?: { cause?: Error }) {
    super("Failed to fetch", { cause: options?.cause });
    this.type = type;
    this.reason = reason;
  }
}

type TypeErrorWithCode = Omit<TypeError, "cause"> & {
  cause: Error & { code: string };
};

const isTypeErrorWithCode = (error: unknown): error is TypeErrorWithCode => {
  return (
    error instanceof TypeError &&
    error.cause instanceof Error &&
    "code" in error.cause &&
    typeof error.cause.code === "string"
  );
};

export const matchErrorCode = <TErrorMap extends ErrorMaps[string]>(code: string, map: TErrorMap) => {
  return objectEntries(map)
    .find(([_, value]) => (typeof value === "string" ? value === code : value.includes(code)))
    ?.at(0) as keyof TErrorMap | undefined;
};

type ErrorMaps = Record<string, Record<string, string | string[]>>;

const errorMap = {
  certificate: {
    expired: ["CERT_HAS_EXPIRED"],
    hostnameMismatch: ["ERR_TLS_CERT_ALTNAME_INVALID", "CERT_COMMON_NAME_INVALID"],
    notYetValid: ["CERT_NOT_YET_VALID"],
    untrusted: ["DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"],
  },
  connection: {
    hostUnreachable: "EHOSTUNREACH",
    networkUnreachable: "ENETUNREACH",
    refused: "ECONNREFUSED",
    reset: "ECONNRESET",
  },
  dns: {
    notFound: "ENOTFOUND",
    timeout: "EAI_AGAIN",
    noAnswer: "ENODATA",
  },
  timeout: {
    aborted: "ECONNABORTED",
    timeout: "ETIMEDOUT",
  },
} satisfies ErrorMaps;

type FetchErrorMap = typeof errorMap;
