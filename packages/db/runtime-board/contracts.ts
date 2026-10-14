import type { BoardPermission } from "@homarr/definitions";

export interface BoardPermissionReplacement {
  readonly principalId: string;
  readonly permission: BoardPermission;
}

export type BoardPermissionsMutation = {
  readonly boardId: string;
  readonly permissions: readonly BoardPermissionReplacement[];
} & ({ readonly kind: "replace-user" } | { readonly kind: "replace-group" });

export class BoardPermissionsMutationError extends Error {
  constructor(readonly code: "BAD_REQUEST" | "NOT_FOUND" | "PRECONDITION_FAILED") {
    let message = "Board permissions precondition failed";
    if (code === "BAD_REQUEST") message = "Invalid board permissions replacement";
    if (code === "NOT_FOUND") message = "Board not found";
    super(message);
    this.name = "BoardPermissionsMutationError";
  }
}

const invalid = (): never => {
  throw new BoardPermissionsMutationError("BAD_REQUEST");
};

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return invalid();
  const entries: [string, unknown][] = [];
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor)) return invalid();
    entries.push([key, descriptor.value]);
  }
  return Object.fromEntries(entries);
};

export function captureBoardPermissionsMutation(
  input: BoardPermissionsMutation,
  maximumRows: number,
): BoardPermissionsMutation {
  if (!Number.isSafeInteger(maximumRows) || maximumRows <= 0 || !Number.isSafeInteger(maximumRows + 1))
    throw new BoardPermissionsMutationError("PRECONDITION_FAILED");
  const mutation = record(input);
  const { kind, boardId } = mutation;
  if (kind !== "replace-user" && kind !== "replace-group") return invalid();
  if (typeof boardId !== "string") return invalid();
  if (!Array.isArray(mutation.permissions)) return invalid();
  if (mutation.permissions.length > maximumRows) throw new BoardPermissionsMutationError("PRECONDITION_FAILED");
  const permissions: BoardPermissionReplacement[] = [];
  for (let index = 0; index < mutation.permissions.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(mutation.permissions, index);
    if (descriptor === undefined || !("value" in descriptor)) return invalid();
    const row = record(descriptor.value);
    const { principalId, permission } = row;
    if (typeof principalId !== "string") return invalid();
    if (permission !== "view" && permission !== "modify" && permission !== "full") return invalid();
    permissions.push(Object.freeze({ principalId, permission }));
  }
  return Object.freeze({ kind, boardId, permissions: Object.freeze(permissions) });
}
