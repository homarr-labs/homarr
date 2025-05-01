export type AnyRequestError = {
  [key in keyof RequestErrorMap]: RequestError<key>;
}[keyof RequestErrorMap];

export type AnyRequestErrorInput = {
  [key in RequestErrorType]: RequestErrorInput<key>;
}[RequestErrorType];

export interface RequestErrorInput<TType extends RequestErrorType> {
  type: TType;
  reason: RequestErrorReason<TType>;
}

export class RequestError<TType extends RequestErrorType> extends Error {
  public readonly type: TType;
  public readonly reason: RequestErrorReason<TType>;

  constructor(input: AnyRequestErrorInput, options: { cause?: Error }) {
    super("Request failed", options);

    this.type = input.type as TType;
    this.reason = input.reason as RequestErrorReason<TType>;
  }

  get cause(): Error | undefined {
    return this.cause;
  }
}

export const requestErrorMap = {
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
} satisfies Record<string, Record<string, string | string[]>>;

type RequestErrorMap = typeof requestErrorMap;

export type RequestErrorType = keyof RequestErrorMap;

export type RequestErrorReason<TType extends RequestErrorType> = keyof RequestErrorMap[TType];
export type AnyRequestErrorReason = {
  [key in keyof RequestErrorMap]: RequestErrorReason<key>;
}[keyof RequestErrorMap];
