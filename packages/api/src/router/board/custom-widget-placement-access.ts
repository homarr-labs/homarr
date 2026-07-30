import { isDeepStrictEqual } from "node:util";

import { TRPCError } from "@trpc/server";

interface BoardPlacement {
  id: string;
  kind: string;
  options: Record<string, unknown>;
}

interface CustomWidgetPlacementGuardInput {
  isAdmin: boolean;
  submittedItems: readonly BoardPlacement[];
  storedItems: readonly BoardPlacement[];
}

const throwAdminRequired = () => {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Only administrators can add or configure Custom Widgets",
  });
};

const assertAuthoringAllowed = (isAdmin: boolean) => {
  if (!isAdmin) throwAdminRequired();
};

/**
 * Protects the security-sensitive part of Custom Widget placements while
 * leaving ordinary board operations (layout, presentation and removal) to the
 * existing board permission checks.
 */
export const throwIfCustomWidgetPlacementChangeForbidden = ({
  isAdmin,
  submittedItems,
  storedItems,
}: CustomWidgetPlacementGuardInput) => {
  const storedById = new Map(storedItems.map((item) => [item.id, item]));
  for (const submitted of submittedItems) {
    const stored = storedById.get(submitted.id);

    if (!stored) {
      if (submitted.kind === "customApi") assertAuthoringAllowed(isAdmin);
      continue;
    }

    const wasCustomWidget = stored.kind === "customApi";
    const isCustomWidget = submitted.kind === "customApi";
    if (wasCustomWidget !== isCustomWidget) {
      if (isCustomWidget) assertAuthoringAllowed(isAdmin);
      else if (!isAdmin) throwAdminRequired();
      continue;
    }
    if (
      wasCustomWidget &&
      !isDeepStrictEqual(normalizeCustomWidgetOptions(submitted.options), normalizeCustomWidgetOptions(stored.options))
    ) {
      assertAuthoringAllowed(isAdmin);
    }
  }
};

export const throwIfCustomWidgetBoardDuplicationForbidden = (
  isAdmin: boolean,
  items: readonly Pick<BoardPlacement, "kind">[],
) => {
  if (items.some((item) => item.kind === "customApi")) assertAuthoringAllowed(isAdmin);
};

function normalizeCustomWidgetOptions(options: Record<string, unknown>) {
  return {
    ...options,
    configuration:
      options.configuration !== null &&
      typeof options.configuration === "object" &&
      !Array.isArray(options.configuration)
        ? options.configuration
        : {},
    configurationVersion:
      typeof options.configurationVersion === "number" && Number.isInteger(options.configurationVersion)
        ? options.configurationVersion
        : 1,
    refreshInterval: typeof options.refreshInterval === "number" ? options.refreshInterval : 30,
  };
}
