import type { fetch as undiciFetch } from "undici";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { AnchorNote, AnchorNotesListInput, AnchorNoteSummary } from "./anchor-types";

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
    const response = await this.requestAsync(fetchWithTrustedCertificatesAsync, "/api/integrations/homarr/notes", queryParams);
    return anchorNoteSummaryListSchema.parse(response);
  }

  public async getNoteAsync(noteId: string): Promise<AnchorNote> {
    const response = await this.requestAsync(
      fetchWithTrustedCertificatesAsync,
      `/api/integrations/homarr/notes/${noteId}`,
    );
    return anchorNoteSchema.parse(response);
  }

  private async requestAsync(
    fetchAsync: typeof undiciFetch,
    path: `/${string}`,
    queryParams?: Record<string, string>,
  ): Promise<unknown> {
    const url = this.url(path, queryParams);
    const response = await fetchAsync(url, {
      headers: {
        Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
      },
    });

    if (!response.ok) {
      throw new ResponseError(response);
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
