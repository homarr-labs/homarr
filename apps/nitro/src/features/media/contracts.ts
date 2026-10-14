import type { MediaDisplayItem, MediaDisplaySelection } from "../../source-ui/media/contracts";

export interface SourceMediaClient {
  readonly media: {
    readonly getPaginated: (
      input: SourceMediaQueryInput,
      options?: { readonly signal?: AbortSignal },
    ) => Promise<SourceMediaPage>;
  };
}

export type SourceMediaPrincipal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "authenticated"; readonly user: { readonly id: string; readonly permissions: readonly string[] } };
export interface SourceMediaPage {
  readonly items: readonly MediaDisplayItem[];
  readonly totalCount: number;
}
export type SourceMediaItem = MediaDisplayItem;
export interface SourceMediaQueryInput {
  readonly search: string;
  readonly page: number;
  readonly pageSize: number;
  readonly includeFromAllUsers: boolean;
}
export type SourceMediaView = "gallery" | "list";

export interface SourceMediaValidation {
  safeParse(input: unknown): { readonly success: boolean };
}

export interface SourceMediaBindings {
  readonly mediaUploadSchema: SourceMediaValidation;
  readonly supportedMediaUploadFormats: readonly string[];
  readonly byIdSchema: SourceMediaValidation;
  readonly createLocalImageUrl: (id: string) => string;
  readonly formatBytes: (size: number, options?: { readonly unit?: "binary" | "decimal" }) => string;
}

export type SourceMediaSelection = MediaDisplaySelection;

export interface SourceMediaMutationUnavailable {
  readonly kind: "unavailable";
  readonly path: "media.uploadMedia" | "media.deleteMedia";
  readonly reason: string;
}

export const sourceMediaMutations = {
  upload: {
    kind: "unavailable",
    path: "media.uploadMedia",
    reason: "Upload is unavailable until the native media and local-icon transaction is admitted.",
  },
  delete: {
    kind: "unavailable",
    path: "media.deleteMedia",
    reason: "Delete is unavailable until the authorized native media and local-icon transaction is admitted.",
  },
} as const satisfies Record<"upload" | "delete", SourceMediaMutationUnavailable>;
