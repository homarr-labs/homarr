import type { fetch as undiciFetch } from "undici";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  AnchorNote,
  AnchorNoteLockStatus,
  AnchorNoteUpdateInput,
  AnchorNotesListInput,
  AnchorNoteSummary,
} from "./anchor-types";

const anchorNoteSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
  isPinned: z.boolean(),
  tagIds: z.array(z.string()),
});

const anchorNoteSchema = anchorNoteSummarySchema.extend({
  content: z.string().nullable().optional(),
  createdAt: z.string(),
  isArchived: z.boolean(),
  background: z.string().nullable().optional(),
});

const anchorNoteSummaryListSchema = z.array(anchorNoteSummarySchema);

const anchorNoteLockStatusSchema = z.object({
  status: z.enum(["acquired", "locked"]),
  lockedBy: z.enum(["anchor", "homarr"]),
  expiresAt: z.string(),
});

const anchorNoteUnlockSchema = z.object({
  status: z.literal("released"),
});

export class AnchorIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    await this.requestAsync(
      input.fetchAsync,
      "/api/integrations/homarr/notes",
      {
        limit: "1",
      },
    );
    return { success: true };
  }

  public async listNotesAsync(input: AnchorNotesListInput = {}): Promise<AnchorNoteSummary[]> {
    const queryParams = buildListQuery(input);
    const response = await this.requestAsync(fetchWithTrustedCertificatesAsync, "/api/integrations/homarr/notes", {
      queryParams,
    });
    return anchorNoteSummaryListSchema.parse(response);
  }

  public async getNoteAsync(noteId: string): Promise<AnchorNote> {
    const response = await this.requestAsync(fetchWithTrustedCertificatesAsync, `/api/integrations/homarr/notes/${noteId}`);
    return anchorNoteSchema.parse(response);
  }

  public async lockNoteAsync(noteId: string): Promise<AnchorNoteLockStatus> {
    const response = await this.requestAsync(
      fetchWithTrustedCertificatesAsync,
      `/api/integrations/homarr/notes/${noteId}/lock`,
      {
        method: "POST",
        allowStatuses: [409],
      },
    );
    return anchorNoteLockStatusSchema.parse(response);
  }

  public async unlockNoteAsync(noteId: string) {
    const response = await this.requestAsync(
      fetchWithTrustedCertificatesAsync,
      `/api/integrations/homarr/notes/${noteId}/lock`,
      {
        method: "DELETE",
      },
    );
    return anchorNoteUnlockSchema.parse(response);
  }

  public async updateNoteAsync(noteId: string, input: AnchorNoteUpdateInput): Promise<AnchorNote> {
    const response = await this.requestAsync(
      fetchWithTrustedCertificatesAsync,
      `/api/integrations/homarr/notes/${noteId}`,
      {
        method: "PATCH",
        body: input,
      },
    );
    return anchorNoteSchema.parse(response);
  }

  private async requestAsync(
    fetchAsync: typeof undiciFetch,
    path: `/${string}`,
    options?: {
      queryParams?: Record<string, string>;
      method?: string;
      body?: unknown;
      allowStatuses?: number[];
    },
  ): Promise<unknown> {
    const url = this.url(path, options?.queryParams);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetchAsync(url, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok && !options?.allowStatuses?.includes(response.status)) {
      throw new ResponseError(response);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }
}

const buildListQuery = (input: AnchorNotesListInput) => {
  const queryParams: Record<string, string> = {};
  if (input.search?.trim()) {
    queryParams.search = input.search.trim();
  }
  if (input.tagId?.trim()) {
    queryParams.tagId = input.tagId.trim();
  }
  if (typeof input.limit === "number") {
    queryParams.limit = input.limit.toString();
  }
  return Object.keys(queryParams).length ? queryParams : undefined;
};
