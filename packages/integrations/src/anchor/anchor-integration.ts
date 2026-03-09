import type { fetch as undiciFetch } from "undici";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import {
  anchorNoteSchema,
  anchorNoteSummaryListSchema,
  type AnchorNote,
  type AnchorNotesListInput,
  type AnchorNoteSummary,
  type AnchorNoteUpdateInput,
} from "./anchor-types";

export class AnchorIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/notes", { limit: 1 }), {
      headers: {
        Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
      },
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    anchorNoteSummaryListSchema.parse(await response.json());
    return { success: true };
  }

  public async listNotesAsync(input: AnchorNotesListInput = {}): Promise<AnchorNoteSummary[]> {
    const queryParams = buildListQuery(input);
    const response = await this.requestAsync(fetchWithTrustedCertificatesAsync, "/api/notes", {
      queryParams,
    });
    return anchorNoteSummaryListSchema.parse(response);
  }

  public async getNoteAsync(noteId: string): Promise<AnchorNote> {
    const response = await this.requestAsync(fetchWithTrustedCertificatesAsync, `/api/notes/${noteId}`);
    return anchorNoteSchema.parse(response);
  }

  public async updateNoteAsync(input: AnchorNoteUpdateInput): Promise<AnchorNote> {
    const { noteId, ...updateData } = input;
    const response = await this.requestAsync(fetchWithTrustedCertificatesAsync, `/api/notes/${noteId}`, {
      method: "PATCH",
      body: updateData,
    });
    return anchorNoteSchema.parse(response);
  }

  private async requestAsync(
    fetchAsync: typeof undiciFetch,
    path: `/${string}`,
    options?: {
      queryParams?: Record<string, string>;
      method?: string;
      body?: unknown;
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

    if (!response.ok) {
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

  return Object.keys(queryParams).length >= 1 ? queryParams : undefined;
};
