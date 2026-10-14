import { NativeTransportCapacityError } from "./boundaries";

export interface NativeOwnershipLimits {
  readonly maxPending: number;
  readonly maxOwned: number;
  readonly acquisitionTimeoutMs: number;
  readonly drainTimeoutMs: number;
}

type NativeReservationState =
  | { kind: "pending" }
  | { kind: "active" }
  | { kind: "quarantined"; previous: "pending" | "active" };

export const validateNativeOwnershipLimits = (limits: NativeOwnershipLimits) => {
  for (const value of [limits.maxPending, limits.maxOwned]) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 4096) {
      throw new RangeError("Native ownership capacities must be integers between 1 and 4096");
    }
  }
  if (limits.maxPending > limits.maxOwned) throw new RangeError("Pending capacity exceeds total ownership capacity");
  for (const value of [limits.acquisitionTimeoutMs, limits.drainTimeoutMs]) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 30000) {
      throw new RangeError("Native ownership timeouts must be integers between 1 and 30000 milliseconds");
    }
  }
};

export const createNativeOwnershipCapacity = (limits: NativeOwnershipLimits) => {
  validateNativeOwnershipLimits(limits);
  const reservations = new Map<object, NativeReservationState>();
  let stopped = false;

  const snapshot = () => {
    let pending = 0;
    let active = 0;
    let quarantined = 0;
    let quarantinedPending = 0;
    for (const state of reservations.values()) {
      if (state.kind === "pending") pending++;
      else if (state.kind === "active") active++;
      else {
        quarantined++;
        if (state.previous === "pending") quarantinedPending++;
      }
    }
    return {
      pending,
      active,
      quarantined,
      pendingCapacityOccupied: pending + quarantinedPending,
      occupied: reservations.size,
      stopped,
    };
  };

  return {
    snapshot,
    reserve() {
      if (stopped) throw new Error("Native ownership admission is retired");
      if (reservations.size >= limits.maxOwned || snapshot().pendingCapacityOccupied >= limits.maxPending) {
        throw new NativeTransportCapacityError();
      }
      const identity = {};
      reservations.set(identity, { kind: "pending" });
      return {
        activate() {
          if (reservations.get(identity)?.kind === "pending") reservations.set(identity, { kind: "active" });
        },
        quarantine() {
          const state = reservations.get(identity);
          if (state && state.kind !== "quarantined") {
            reservations.set(identity, { kind: "quarantined", previous: state.kind });
          }
        },
        releaseUndispatched() {
          if (reservations.get(identity)?.kind !== "pending") {
            throw new Error("Only an undispatched pending reservation may be released");
          }
          reservations.delete(identity);
        },
      };
    },
    retire() {
      stopped = true;
    },
  };
};
