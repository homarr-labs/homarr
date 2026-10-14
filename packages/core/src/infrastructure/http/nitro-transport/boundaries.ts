export const nativeTransportBoundaries = [
  "native-admission-and-pending-capacity-hook-unavailable",
  "native-queued-cancellation-removal-hook-unavailable",
  "native-pre-pool-and-late-connector-settlement-hook-unavailable",
  "native-routing-and-proxy-tls-public-hook-unavailable",
  "resource-https-independent-join-can-reject-before-physical-drain",
  "trusted-fetch-response-does-not-expose-physical-settlement",
] as const;

export type NativeTransportBoundary = (typeof nativeTransportBoundaries)[number] | "q17-ca-override-undecided";

export class UnsupportedNativeTransportError extends Error {
  readonly code = "NATIVE_TRANSPORT_OWNERSHIP_UNSUPPORTED";

  constructor(readonly boundaries: readonly NativeTransportBoundary[]) {
    super(`Native transport ownership is held: ${boundaries.join(", ")}`);
    this.name = "UnsupportedNativeTransportError";
  }
}

export class NativeTransportCapacityError extends Error {
  readonly code = "NATIVE_TRANSPORT_OWNERSHIP_CAPACITY";

  constructor() {
    super("Native transport ownership capacity is occupied, including unsettled acquisitions");
    this.name = "NativeTransportCapacityError";
  }
}
