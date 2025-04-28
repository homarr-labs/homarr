import type { X509Certificate } from "node:crypto";
import tls from "node:tls";
import type { Response as UndiciResponse } from "undici";

import { getAllTrustedCertificatesAsync } from "@homarr/certificates/server";
import type { AnyFetchError } from "@homarr/common";
import { FetchError, tryParseFetchError } from "@homarr/common";

export type TestingResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: AnyTestConnectionError;
    };
type AsyncTestingCallback = (input: { ca: string[] | string }) => Promise<TestingResult>;

export class TestConnectionService {
  constructor(private url: URL) {}

  public async handleAsync(testingCallbackAsync: AsyncTestingCallback) {
    const firstResult = await testingCallbackAsync({ ca: await getAllTrustedCertificatesAsync() })
      .then((result) => {
        if (result.success) return result;

        const error = result.error;
        if (error instanceof TestConnectionError) return error.toResult();

        return TestConnectionError.UnknownResult(error);
      })
      .catch((error: unknown) => {
        let fetchError: AnyFetchError | undefined = undefined;
        if (error instanceof FetchError) {
          fetchError = error;
        }

        fetchError ??= tryParseFetchError(error);

        if (!fetchError) {
          return TestConnectionError.UnknownResult(error);
        }

        if (fetchError.type !== "certificate") {
          return TestConnectionError.FetchResult(fetchError);
        }
        return {
          success: false,
          error: fetchError,
        } as const;
      });

    if (firstResult.success) {
      return firstResult;
    }

    if (!(firstResult.error instanceof FetchError)) {
      return firstResult.error.toResult();
    }

    return await this.handleCertificateErrorAsync(testingCallbackAsync, firstResult.error);
  }

  private async handleCertificateErrorAsync(
    testingCallbackAsync: AsyncTestingCallback,
    fetchError: FetchError<"certificate">,
  ): Promise<
    | {
        success: true;
      }
    | {
        success: false;
        error: TestConnectionError<keyof TestConnectionErrorMap>;
      }
  > {
    const certificate = await this.fetchCertificateAsync();
    if (!certificate) {
      return TestConnectionError.UnknownResult(new Error("Unable to fetch certificate"));
    }

    const fallbackResult = TestConnectionError.CertificateResult(fetchError, certificate);

    if (fetchError.reason !== "untrusted") {
      return fallbackResult;
    }

    const caResult = await testingCallbackAsync({
      ca: certificate.toString(),
    })
      // If we reach then, it means it would be trusted with the CA
      .then(() => ({ success: true }) as const)
      .catch((error: unknown) => {
        const fetchError = tryParseFetchError(error);
        if (!(fetchError && fetchError.type === "certificate")) {
          return TestConnectionError.UnknownResult(error);
        }

        return TestConnectionError.CertificateResult(fetchError, certificate);
      });

    if (caResult.success) {
      return fallbackResult;
    }

    return caResult;
  }

  private async fetchCertificateAsync(): Promise<X509Certificate | undefined> {
    const url = this.url;
    const port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
    const socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      try {
        const innerSocket = tls.connect(
          {
            host: url.hostname,
            servername: url.hostname,
            port,
            rejectUnauthorized: false,
          },
          () => {
            resolve(innerSocket);
          },
        );
      } catch (error) {
        reject(new Error("Unable to fetch certificate", { cause: error }));
      }
    });

    const x509 = socket.getPeerX509Certificate();
    socket.destroy();
    return x509;
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
    fetchError: FetchError<"certificate">;
    certificate: X509Certificate;
  };
  fetch: {
    fetchError: Exclude<AnyFetchError, FetchError<"certificate">>;
  };
}

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

  public static UnknownResult(cause: unknown) {
    return new TestConnectionError("unknown", undefined, {
      cause: cause instanceof Error ? cause : undefined,
    }).toResult();
  }

  public static FetchResult(fetchError: Exclude<AnyFetchError, FetchError<"certificate">>) {
    return new TestConnectionError(
      "fetch",
      { fetchError: fetchError },
      {
        cause: fetchError,
      },
    ).toResult();
  }

  public static CertificateResult(fetchError: FetchError<"certificate">, certificate: X509Certificate) {
    return new TestConnectionError(
      "certificate",
      {
        fetchError,
        certificate,
      },
      {
        cause: fetchError,
      },
    ).toResult();
  }

  public static UnauthorizedResult() {
    return new TestConnectionError("unauthorized", undefined).toResult();
  }

  public static StatusResult(input: { status: number; url: string } | UndiciResponse) {
    if (input.status === 401) return this.UnauthorizedResult();

    return new TestConnectionError("statusCode", {
      statusCode: input.status,
      reason: input.status in statusCodeMap ? statusCodeMap[input.status as keyof typeof statusCodeMap] : "other",
      url: input.url,
    }).toResult();
  }
}
