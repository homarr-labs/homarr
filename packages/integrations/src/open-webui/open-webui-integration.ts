import { FormData } from "undici";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  OpenWebUiChat,
  OpenWebUiChatListItem,
  OpenWebUiChatPayload,
  OpenWebUiCompletionMessage,
  OpenWebUiFileSummary,
  OpenWebUiKnowledge,
  OpenWebUiModel,
  OpenWebUiNote,
  OpenWebUiWebDocument,
} from "./open-webui-types";
import {
  openWebUiChatListItemSchema,
  openWebUiChatSchema,
  openWebUiCollectionQueryResponseSchema,
  openWebUiCompletionChunkSchema,
  openWebUiFileListSchema,
  openWebUiKnowledgeListSchema,
  openWebUiModelsResponseSchema,
  openWebUiNoteListSchema,
  openWebUiNoteSchema,
  openWebUiProcessWebResponseSchema,
  openWebUiTranscriptionSchema,
  openWebUiUploadedFileSchema,
} from "./open-webui-types";

const logger = createLogger({ module: "open-webui-integration" });

// The (undici) request options accepted by the shared fetch helper. Derived so
// the request helpers stay in sync with the underlying fetch types.
type RequestOptions = NonNullable<Parameters<typeof fetchWithTrustedCertificatesAsync>[1]>;

export class OpenWebUiIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/models"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return { success: true };
  }

  /**
   * List the models served by Open WebUI (aggregates all configured providers).
   */
  public async getModelsAsync(): Promise<OpenWebUiModel[]> {
    const parsed = await this.getJsonAsync("/api/models", openWebUiModelsResponseSchema);
    return parsed.data;
  }

  /**
   * List the knowledge bases (RAG collections) the user can ground chats on.
   */
  public async getKnowledgeAsync(): Promise<OpenWebUiKnowledge[]> {
    const parsed = await this.getJsonAsync("/api/v1/knowledge/", openWebUiKnowledgeListSchema);
    return Array.isArray(parsed) ? parsed : parsed.items;
  }

  /**
   * List the user's uploaded files (for the "Attach Files" picker).
   */
  public async listFilesAsync(): Promise<OpenWebUiFileSummary[]> {
    const files = await this.fetchFilesAsync();
    return files.map((file) => ({ id: file.id, name: file.meta?.name ?? file.filename ?? file.id }));
  }

  /**
   * List the files contained in a knowledge base (for the expandable picker).
   * The knowledge detail endpoint returns `files: null` on recent versions, so
   * we read the files list and filter by the base's collection id instead.
   */
  public async getKnowledgeFilesAsync(knowledgeId: string): Promise<OpenWebUiFileSummary[]> {
    const files = await this.fetchFilesAsync();
    return files
      .filter((file) => file.meta?.collection_name === knowledgeId)
      .map((file) => ({ id: file.id, name: file.meta?.name ?? file.filename ?? file.id }));
  }

  /** Fetch the raw file list, normalizing the paginated and bare-array shapes. */
  private async fetchFilesAsync() {
    const parsed = await this.getJsonAsync("/api/v1/files/", openWebUiFileListSchema);
    return Array.isArray(parsed) ? parsed : parsed.items;
  }

  /**
   * List the user's notes (for the "Attach Notes" picker).
   */
  public async listNotesAsync(): Promise<OpenWebUiNote[]> {
    const parsed = await this.getJsonAsync("/api/v1/notes/", openWebUiNoteListSchema);
    const notes = Array.isArray(parsed) ? parsed : parsed.items;
    return notes.map((note) => ({
      id: note.id,
      title: note.title ?? "Untitled note",
      content: note.data?.content?.md ?? "",
    }));
  }

  /**
   * Get a single note including its full markdown content. The list endpoint
   * truncates the body, so we fetch the note directly when attaching it.
   */
  public async getNoteAsync(noteId: string): Promise<OpenWebUiNote> {
    const parsed = await this.getJsonAsync(`/api/v1/notes/${encodeURIComponent(noteId)}`, openWebUiNoteSchema);
    return { id: parsed.id, title: parsed.title ?? "Untitled note", content: parsed.data?.content?.md ?? "" };
  }

  /**
   * Transcribe recorded audio to text (speech-to-text) for voice messages.
   */
  public async transcribeAudioAsync(filename: string, base64Content: string, contentType: string): Promise<string> {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(base64Content, "base64")], { type: contentType }), filename);

    const parsed = await this.postFormAsync("/api/v1/audio/transcriptions", form, openWebUiTranscriptionSchema);
    return parsed.text;
  }

  /**
   * Upload a file to Open WebUI so it can be retrieved from later. Returns the
   * new file id (its vector collection is `file-{id}`).
   */
  public async uploadFileAsync(
    filename: string,
    base64Content: string,
    contentType: string,
  ): Promise<OpenWebUiFileSummary> {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(base64Content, "base64")], { type: contentType }), filename);

    const parsed = await this.postFormAsync("/api/v1/files/", form, openWebUiUploadedFileSchema);
    return { id: parsed.id, name: parsed.meta?.name ?? parsed.filename ?? filename };
  }

  /**
   * Ingest a web page into a temporary vector collection and return a handle to
   * retrieve from it. Open WebUI does not crawl URLs at completion time, so we
   * embed the page here and inject retrieved chunks ourselves at send time.
   */
  public async processWebAsync(url: string): Promise<OpenWebUiWebDocument> {
    const parsed = await this.postJsonAsync(
      "/api/v1/retrieval/process/web",
      { url, collection_name: "" },
      openWebUiProcessWebResponseSchema,
    );
    return { collectionName: parsed.collection_name, title: parsed.file?.meta?.name ?? url };
  }

  /**
   * Retrieve the most relevant chunks for a query across the given collections
   * (web pages and/or knowledge bases). Returns the chunk texts, best-effort.
   */
  public async queryCollectionsAsync(collectionNames: string[], query: string, k = 4): Promise<string[]> {
    if (collectionNames.length === 0 || query.trim() === "") {
      return [];
    }

    const parsed = await this.postJsonAsync(
      "/api/v1/retrieval/query/collection",
      { collection_names: collectionNames, query, k },
      openWebUiCollectionQueryResponseSchema,
    );
    return (parsed.documents ?? []).flat();
  }

  /**
   * List the user's chats (native Open WebUI history).
   */
  public async listChatsAsync(): Promise<OpenWebUiChatListItem[]> {
    return await this.getJsonAsync("/api/v1/chats/", openWebUiChatListItemSchema.array());
  }

  /**
   * Get a single chat including its messages.
   */
  public async getChatAsync(chatId: string): Promise<OpenWebUiChat> {
    return await this.getJsonAsync(`/api/v1/chats/${encodeURIComponent(chatId)}`, openWebUiChatSchema);
  }

  /**
   * Create a new chat in the native history.
   */
  public async createChatAsync(payload: OpenWebUiChatPayload): Promise<OpenWebUiChat> {
    return await this.postJsonAsync("/api/v1/chats/new", { chat: payload }, openWebUiChatSchema);
  }

  /**
   * Update an existing chat in the native history.
   */
  public async updateChatAsync(chatId: string, payload: OpenWebUiChatPayload): Promise<OpenWebUiChat> {
    return await this.postJsonAsync(
      `/api/v1/chats/${encodeURIComponent(chatId)}`,
      { chat: payload },
      openWebUiChatSchema,
    );
  }

  /**
   * Stream an assistant completion token-by-token.
   * Reads the OpenAI-compatible SSE response and invokes `onDelta` for each
   * content delta. Resolves when the stream completes ([DONE]) or is aborted.
   */
  public async streamChatCompletionAsync(
    params: { model: string; messages: OpenWebUiCompletionMessage[] },
    onDelta: (delta: string) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await this.requestAsync("/api/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: params.model, messages: params.messages, stream: true }),
      signal,
    });

    if (!response.body) {
      throw new ResponseError(response);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const processLine = (line: string): boolean => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return false;

      const payload = trimmed.slice(5).trim();
      if (payload === "") return false;
      if (payload === "[DONE]") return true;

      try {
        const parsed = openWebUiCompletionChunkSchema.parse(JSON.parse(payload));
        const choice = parsed.choices?.[0];
        if (choice?.delta?.content) {
          onDelta(choice.delta.content);
        }
        // Some providers end the stream with a finish_reason chunk and no
        // explicit [DONE] sentinel; treat that as a clean completion too.
        if (choice?.finish_reason) return true;
      } catch {
        logger.debug("Failed to parse Open WebUI completion chunk", { line: trimmed });
      }
      return false;
    };

    let completed = false;
    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (processLine(line)) {
            completed = true;
            break;
          }
        }
        if (completed) break;
      }
    } finally {
      reader.cancel().catch(() => {
        // ignore cancellation errors during teardown
      });
    }

    // The reader ended without a [DONE]/finish_reason marker: the upstream
    // connection was cut mid-stream. Surface it instead of presenting the
    // partial reply as a complete answer.
    if (!signal.aborted && !completed) {
      throw new Error("Open WebUI stream ended before completion");
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
  }

  /**
   * Issue an authenticated request against the Open WebUI API and throw a
   * {@link ResponseError} on a non-2xx status. Centralizes the auth header,
   * trusted-certificate fetch and error handling shared by every endpoint.
   */
  private async requestAsync(
    path: `/${string}`,
    init?: Omit<RequestOptions, "headers"> & { headers?: Record<string, string> },
  ) {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path), {
      ...init,
      headers: { ...this.getAuthHeaders(), ...init?.headers },
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return response;
  }

  /** GET an endpoint and validate the JSON body against `schema`. */
  private async getJsonAsync<TOutput>(
    path: `/${string}`,
    schema: { parse: (data: unknown) => TOutput },
  ): Promise<TOutput> {
    const response = await this.requestAsync(path);
    return schema.parse(await response.json());
  }

  /** POST a JSON body and validate the JSON response against `schema`. */
  private async postJsonAsync<TOutput>(
    path: `/${string}`,
    body: unknown,
    schema: { parse: (data: unknown) => TOutput },
  ): Promise<TOutput> {
    const response = await this.requestAsync(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return schema.parse(await response.json());
  }

  /** POST a multipart form (file upload) and validate the JSON response. */
  private async postFormAsync<TOutput>(
    path: `/${string}`,
    form: FormData,
    schema: { parse: (data: unknown) => TOutput },
  ): Promise<TOutput> {
    const response = await this.requestAsync(path, { method: "POST", body: form });
    return schema.parse(await response.json());
  }
}
