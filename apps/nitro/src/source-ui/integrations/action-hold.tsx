import { Alert, Stack } from "@mantine/core";

export type IntegrationAction =
  | "create"
  | "update"
  | "delete"
  | "test"
  | "grants"
  | "trust"
  | "uploadCertificate"
  | "appCreate";

export type IntegrationActionAvailability = { state: "available" } | { state: "held"; reason: string };

export type IntegrationActionAvailabilityMap = Partial<Record<IntegrationAction, IntegrationActionAvailability>>;

export const integrationActionHold: IntegrationActionAvailability = {
  state: "held",
  reason: "Native Integration actions are unavailable until the transport, session and security joins are verified.",
};

export function IntegrationActionHold({ availability }: { availability: IntegrationActionAvailability }) {
  if (availability.state === "available") return null;
  return (
    <Alert color="yellow" title="Action unavailable" aria-live="polite">
      {availability.reason}
    </Alert>
  );
}

export function IntegrationActionHolds({ availability }: { availability: IntegrationActionAvailability[] }) {
  const reasons = new Set<string>();
  for (const action of availability) {
    if (action.state === "held") reasons.add(action.reason);
  }
  if (reasons.size === 0) return null;
  return (
    <Stack gap="xs">
      {[...reasons].map((reason) => (
        <IntegrationActionHold key={reason} availability={{ state: "held", reason }} />
      ))}
    </Stack>
  );
}
