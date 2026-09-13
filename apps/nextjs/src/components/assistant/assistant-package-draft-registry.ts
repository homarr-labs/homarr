import type {
  PackageChangesResult,
  PackageDraftReview,
  ProposePackageChangesArgs,
  ReadPackageDraftArgs,
} from "./assistant-package-draft-contracts";

interface PackageDraftAdapter {
  read(input: ReadPackageDraftArgs): unknown;
  review(input: ProposePackageChangesArgs): PackageDraftReview;
  apply(input: ProposePackageChangesArgs): PackageChangesResult;
}

let adapter: PackageDraftAdapter | undefined;
let version = 0;
const listeners = new Set<() => void>();
const unavailable = "Open the widget package workspace before using draft tools.";

export function notifyPackageDraftChanged() {
  version += 1;
  for (const listener of listeners) listener();
}

export function registerAssistantPackageDraft(next: PackageDraftAdapter) {
  adapter = next;
  notifyPackageDraftChanged();
  return () => {
    if (adapter !== next) return;
    adapter = undefined;
    notifyPackageDraftChanged();
  };
}

export function subscribeAssistantPackageDraft(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getAssistantPackageDraftVersion = () => version;
export const getServerPackageDraftVersion = () => 0;
export const readAssistantPackageDraft = (input: ReadPackageDraftArgs) =>
  adapter?.read(input) ?? { error: unavailable };
export const reviewAssistantPackageChanges = (input: ProposePackageChangesArgs): PackageDraftReview =>
  adapter?.review(input) ?? { available: false, error: unavailable, changes: [] };
export const applyAssistantPackageChanges = (input: ProposePackageChangesArgs): PackageChangesResult =>
  adapter?.apply(input) ?? { applied: false, error: unavailable };
