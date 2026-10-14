import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { Alert, Button, Stack, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";

import type { WorkshopFeatureBinding } from "./client";
import type { WorkshopFlowLease } from "./flow";

const WorkshopContext = createContext<WorkshopFeatureBinding | null>(null);

export function WorkshopFeatureScope({ binding, children }: { binding: WorkshopFeatureBinding; children: ReactNode }) {
  if (binding.principal.kind !== "authenticated" || !binding.principal.user.permissions.includes("admin")) {
    return (
      <Alert color="red" title="Administrator access required">
        Workshop widget management is restricted to administrators.
      </Alert>
    );
  }
  const key = [
    binding.authorityKey,
    binding.principal.user.id,
    binding.readOnly,
    binding.transport.kind === "available" ? binding.transport.authorityKey : "held",
  ];
  return (
    <WorkshopContext.Provider key={JSON.stringify(key)} value={binding}>
      {children}
    </WorkshopContext.Provider>
  );
}

export function useWorkshopFeature() {
  const binding = useContext(WorkshopContext);
  if (!binding) throw new Error("WorkshopFeatureScope is required");
  const userId = binding.principal.kind === "authenticated" ? binding.principal.user.id : "anonymous";
  return { ...binding, queryKey: ["native", binding.authorityKey, userId, "workshop"] as const };
}

export function useInvalidateWorkshop() {
  const { queryKey, onDefinitionsChanged } = useWorkshopFeature();
  const queryClient = useQueryClient();
  return (lease: WorkshopFlowLease) => {
    if (!lease.isCurrent()) return Promise.resolve();
    onDefinitionsChanged();
    if (!lease.isCurrent()) return Promise.resolve();
    return queryClient.invalidateQueries({ queryKey });
  };
}

export function WorkshopFailure({ error, retry }: { error: unknown; retry?: () => void }) {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  const message =
    code === "CONFLICT"
      ? "The saved widget changed. Reload it and create a new preview before updating."
      : code === "FORBIDDEN" || code === "UNAUTHORIZED"
        ? "Your current account no longer has access. Refresh your session before continuing."
        : code === "BAD_REQUEST" || code === "PRECONDITION_FAILED"
          ? "Review the widget, source configuration, and current preview evidence before trying again."
          : "The request could not be completed. Workshop or its required resources may be unavailable.";
  return (
    <Alert color="red" title="Request failed">
      <Stack gap="xs">
        <Text size="sm">{message}</Text>
        {retry && (
          <Button variant="default" size="xs" onClick={retry}>
            Retry request
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

export function WorkshopTransportHold() {
  return (
    <Alert color="yellow" title="Workshop connection not joined">
      Community browsing and publishing require the genuine Workshop transport. No marketplace results or connection
      status are being simulated.
    </Alert>
  );
}

export function isAmbiguousWorkshopFailure(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  return !["BAD_REQUEST", "PRECONDITION_FAILED", "CONFLICT", "FORBIDDEN", "UNAUTHORIZED", "NOT_FOUND"].includes(
    typeof code === "string" ? code : "",
  );
}

export function WorkshopWriteOutcomeHold() {
  return (
    <Alert color="yellow" title="Write outcome not verified">
      A failure response does not prove the write was rejected. Inspect the saved widget or Workshop submission before
      starting another attempt. Automatic retry is disabled.
    </Alert>
  );
}
