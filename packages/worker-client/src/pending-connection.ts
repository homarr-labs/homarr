import { parseConnectionLink } from "./connection";

const storageKey = "homarr-remote-pending-bootstrap-v1";
let pendingInMemory = "";

function bootstrapLink(value: unknown): string {
  if (typeof value !== "string" || value.length > 65_536) return "";
  try {
    const input = parseConnectionLink(value);
    if (input.credential.kind === "claim" || input.credential.kind === "invite") return value;
  } catch {
    // Only a complete bootstrap link can be resumed. Never keep share/grant access here.
  }
  return "";
}

/** This browser tab only; never send a pending bootstrap to the account service. */
export function rememberPendingConnection(value: string): void {
  const link = bootstrapLink(value);
  if (!link) {
    clearPendingConnection();
    return;
  }
  pendingInMemory = link;
  try {
    window.sessionStorage.setItem(storageKey, link);
  } catch {
    /* A blocked session store still permits reopening the dialog on this page. */
  }
}

export function readPendingConnection(): string {
  if (pendingInMemory) return pendingInMemory;
  try {
    pendingInMemory = bootstrapLink(window.sessionStorage.getItem(storageKey));
  } catch {
    return "";
  }
  if (!pendingInMemory) clearPendingConnection();
  return pendingInMemory;
}

export function clearPendingConnection(): void {
  pendingInMemory = "";
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    /* Storage can be disabled; memory is still cleared. */
  }
}
