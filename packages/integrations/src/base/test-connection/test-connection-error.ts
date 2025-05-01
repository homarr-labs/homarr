import type { X509Certificate } from "node:crypto";

import type { AnyRequestError, ParseError, RequestError } from "@homarr/common";

import { IntegrationResponseError } from "../error";
import { IntegrationRequestError } from "../errors/http/integration-request-error";
import type { IntegrationError } from "../errors/integration-error";
import { IntegrationUnknownError } from "../errors/integration-unknown-error";
import { IntegrationParseError } from "../errors/parse/integration-parse-error";

export type AnyTestConnectionError = TestConnectionError<keyof TestConnectionErrorMap>;

export class TestConnectionError<TType extends keyof TestConnectionErrorMap> extends Error {
  public readonly type: TType;
  public readonly data: TestConnectionErrorMap[TType];

  private constructor(type: TType, data: TestConnectionErrorMap[TType], options?: ErrorOptions) {
    super("Unable to connect to the integration.", options);
    this.type = type;
    this.data = data;
  }

  public toResult() {
    return {
      success: false,
      error: this as TestConnectionError<keyof TestConnectionErrorMap>,
    } as const;
  }

  private static Unknown(cause: unknown) {
    return new TestConnectionError("unknown", undefined, {
      cause: cause instanceof Error ? cause : undefined,
    });
  }

  public static UnknownResult(cause: unknown) {
    return this.Unknown(cause).toResult();
  }

  private static Certificate(requestError: RequestError<"certificate">, certificate: X509Certificate) {
    return new TestConnectionError(
      "certificate",
      {
        requestError: requestError,
        certificate,
      },
      {
        cause: requestError,
      },
    );
  }

  public static CertificateResult(requestError: RequestError<"certificate">, certificate: X509Certificate) {
    return this.Certificate(requestError, certificate).toResult();
  }

  private static Unauthorized() {
    return new TestConnectionError("unauthorized", undefined);
  }

  public static UnauthorizedResult() {
    return this.Unauthorized().toResult();
  }

  private static Status(input: { status: number; url: string }) {
    if (input.status === 401) return this.Unauthorized();

    return new TestConnectionError("statusCode", {
      statusCode: input.status,
      reason: input.status in statusCodeMap ? statusCodeMap[input.status as keyof typeof statusCodeMap] : "other",
      url: input.url,
    });
  }

  public static StatusResult(input: { status: number; url: string }) {
    return this.Status(input).toResult();
  }

  private static Request(requestError: Exclude<AnyRequestError, RequestError<"certificate">>) {
    return new TestConnectionError(
      "request",
      { requestError },
      {
        cause: requestError,
      },
    );
  }

  public static RequestResult(requestError: Exclude<AnyRequestError, RequestError<"certificate">>) {
    return this.Request(requestError).toResult();
  }

  private static Parse(cause: ParseError) {
    return new TestConnectionError(
      "parse",
      {
        parseError: cause,
      },
      { cause },
    );
  }

  public static ParseResult(cause: ParseError) {
    return this.Parse(cause).toResult();
  }

  static FromIntegrationError(error: IntegrationError): AnyTestConnectionError {
    if (error instanceof IntegrationUnknownError) {
      return this.Unknown(error.cause);
    }
    if (error instanceof IntegrationRequestError) {
      if (error.cause.type === "certificate") {
        return this.Unknown(new Error("FromIntegrationError can not be used for certificate errors", { cause: error }));
      }

      return this.Request(error.cause);
    }
    if (error instanceof IntegrationResponseError) {
      return this.Status({
        status: error.statusCode,
        url: error.url,
      });
    }
    if (error instanceof IntegrationParseError) {
      return this.Parse(error.cause);
    }

    return this.Unknown(new Error("FromIntegrationError received unknown IntegrationError", { cause: error }));
  }
}

const statusCodeMap = {
  400: "badRequest",
  403: "forbidden",
  404: "notFound",
  429: "toManyRequests",
  500: "internalServerError",
  503: "serviceUnavailable",
  504: "gatewayTimeout",
} as const;

interface TestConnectionErrorMap {
  unknown: undefined;
  unauthorized: undefined;
  statusCode: {
    statusCode: number;
    reason: (typeof statusCodeMap)[keyof typeof statusCodeMap] | "other";
    url: string;
  };
  certificate: {
    requestError: RequestError<"certificate">;
    certificate: X509Certificate;
  };
  request: {
    requestError: Exclude<AnyRequestError, RequestError<"certificate">>;
  };
  parse: {
    parseError: ParseError;
  };
}
