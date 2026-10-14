export type RuntimeJoinSlot =
  | {
      readonly id:
        | "main-persistence"
        | "public-settings"
        | "public-culture"
        | "public-rpc"
        | "authenticated-principal"
        | "authenticated-read-rpc";
      readonly state: "prepared";
      readonly holds: readonly string[];
    }
  | {
      readonly id:
        | "authenticated-principal"
        | "compatible-native-writers"
        | "integration-clients"
        | "widget-request-primitives"
        | "state-sql"
        | "history-sql"
        | "jobs-sql"
        | "copied-catalog"
        | "public-render-hydration"
        | "production-listener";
      readonly state: "unjoined";
      readonly requires: readonly string[];
    };

export const runtimeJoinSlots: readonly RuntimeJoinSlot[] = Object.freeze([
  {
    id: "main-persistence",
    state: "prepared",
    holds: ["accepted runtime/seed/migration graph", "direct app declarations", "physical readiness/drain proof"],
  },
  {
    id: "public-settings",
    state: "prepared",
    holds: ["actual createSettingsStore/settingsCodec/schema/operators injection", "public SQL projection proof"],
  },
  {
    id: "public-culture",
    state: "prepared",
    holds: ["actual translation and cookie factories", "document/guest cookie integration proof"],
  },
  {
    id: "public-rpc",
    state: "prepared",
    holds: ["exact two-source-leaf registry", "actual setup-read factory", "whole-Fetch SQL/serialization proof"],
  },
  {
    id: "authenticated-principal",
    state: "unjoined",
    requires: [
      "Q16",
      "accepted credential/session engine",
      "current source permission snapshot",
      "revocation and origin policy",
    ],
  },
  {
    id: "compatible-native-writers",
    state: "unjoined",
    requires: [
      "current authority to native COMMIT",
      "all enabled writer lock compatibility",
      "bounded dispatch and ambiguity preservation",
    ],
  },
  {
    id: "integration-clients",
    state: "unjoined",
    requires: [
      "frozen/reviewed nitro-bindings",
      "actual secret codec",
      "current-authority leases",
      "accepted trust and Q17",
      "Q18 grant policy",
      "physical client retirement",
    ],
  },
  {
    id: "widget-request-primitives",
    state: "unjoined",
    requires: [
      "frozen/reviewed named nitro-bindings",
      "WidgetRequestPrimitives",
      "current resource grants",
      "Q18",
      "SQL history/state ownership",
    ],
  },
  {
    id: "state-sql",
    state: "unjoined",
    requires: [
      "frozen/reviewed native state factory",
      "explicit shared epoch initialization owner",
      "native expiry/CAS settlement",
    ],
  },
  {
    id: "history-sql",
    state: "unjoined",
    requires: [
      "frozen/reviewed native history factory",
      "state-owner captured epoch",
      "accepted epoch/header lock order",
      "producer and subscription retirement",
    ],
  },
  {
    id: "jobs-sql",
    state: "unjoined",
    requires: [
      "frozen/reviewed native jobs factory",
      "state-owner captured epoch",
      "bound statements and snapshot batches",
      "same-listener SSE cancellation/settlement",
    ],
  },
  {
    id: "copied-catalog",
    state: "unjoined",
    requires: [
      "P2 freeze/review",
      "exact old49/new50 copied-image admission",
      "restore maintenance/supervision/recovery",
    ],
  },
  {
    id: "public-render-hydration",
    state: "unjoined",
    requires: [
      "explicit prepared render input",
      "versioned bootstrap/client reconstruction",
      "same public providers",
      "source theme/navigation adapters",
    ],
  },
  {
    id: "production-listener",
    state: "unjoined",
    requires: [
      "coordinator mounting after review",
      "accepted same-listener entry/lifecycle join",
      "owned output and pre-drain proof",
    ],
  },
]);

export function requireRuntimeJoin(slot: RuntimeJoinSlot): never {
  throw new Error(`Runtime join is not admitted: ${slot.id} (${slot.state})`);
}

export function getRuntimeJoinSlots(kind: "public-only" | "authenticated-read"): readonly RuntimeJoinSlot[] {
  if (kind === "public-only") return runtimeJoinSlots;
  const slots = runtimeJoinSlots.map((slot): RuntimeJoinSlot => {
    if (slot.id !== "authenticated-principal") return slot;
    return {
      id: "authenticated-principal",
      state: "prepared",
      holds: [
        "same-owner read construction enrolled",
        "coordinator static and physical read validation pending",
        "HTTP issuance publication held",
      ],
    };
  });
  slots.push({
    id: "authenticated-read-rpc",
    state: "prepared",
    holds: [
      "exact eleven native queries enrolled",
      "finite publication and shutdown validation pending",
      "native writes and private SSR held",
    ],
  });
  return Object.freeze(slots);
}
