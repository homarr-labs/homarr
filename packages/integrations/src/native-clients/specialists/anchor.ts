import { IntegrationTransportStatusError } from "../../runtime/transport-errors";
import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import { anchorNoteSchema, anchorNoteSummaryListSchema } from "../../anchor/anchor-types";
import type {
  AnchorNote,
  AnchorNotesListInput,
  AnchorNoteSummary,
  AnchorNoteUpdateInput,
} from "../../anchor/anchor-types";
import { SpecialistProtocol } from "./protocol";
import type { SpecialistHttp, SpecialistQuery } from "./protocol";

export class AnchorProtocol extends SpecialistProtocol {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(
      this.url("/api/notes", { limit: 1 }),
      { headers: this.headers() },
      async (response) => {
        if (!response.ok) return this.statusResult(response);
        anchorNoteSummaryListSchema.parse(await response.json());
        return { success: true };
      },
    );
  }

  async listNotesAsync(input: AnchorNotesListInput = {}): Promise<AnchorNoteSummary[]> {
    const query: SpecialistQuery = {};
    if (input.search?.trim()) query.search = input.search.trim();
    if (input.tagId?.trim()) query.tagId = input.tagId.trim();
    if (typeof input.limit === "number") query.limit = String(input.limit);
    return this.runAsync(async (http) =>
      anchorNoteSummaryListSchema.parse(await this.requestAsync(http, "/api/notes", { query })),
    );
  }

  async getNoteAsync(noteId: string): Promise<AnchorNote> {
    return this.runAsync(async (http) => anchorNoteSchema.parse(await this.requestAsync(http, `/api/notes/${noteId}`)));
  }

  async updateNoteAsync(input: AnchorNoteUpdateInput): Promise<AnchorNote> {
    return this.interactAsync(() =>
      this.runAsync(async (http) => {
        const { noteId, ...body } = input;
        const response = await this.requestAsync(http, `/api/notes/${noteId}`, { method: "PATCH", body });
        return anchorNoteSchema.parse(
          response === null ? await this.requestAsync(http, `/api/notes/${noteId}`) : response,
        );
      }),
    );
  }

  private headers() {
    return { Authorization: `Bearer ${this.secret("apiKey")}` };
  }

  private async requestAsync(
    http: SpecialistHttp,
    path: `/${string}`,
    options?: { query?: SpecialistQuery; method?: string; body?: unknown },
  ) {
    return http.responseAsync(
      this.url(path, options?.query),
      {
        method: options?.method ?? "GET",
        headers: { ...this.headers(), ...(options?.body !== undefined ? { "Content-Type": "application/json" } : {}) },
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      },
      async (response) => {
        if (!response.ok) {
          await response.text().catch(() => null);
          this.resources.log?.write("warn", "Anchor request failed", { statusCode: response.status });
          throw new IntegrationTransportStatusError(response.status);
        }
        return response.status === 204 ? null : await response.json();
      },
    );
  }
}
