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
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/models"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return openWebUiModelsResponseSchema.parse(await response.json()).data;
  }

  /**
   * List the knowledge bases (RAG collections) the user can ground chats on.
   */
  public async getKnowledgeAsync(): Promise<OpenWebUiKnowledge[]> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/knowledge/"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = openWebUiKnowledgeListSchema.parse(await response.json());
    return Array.isArray(parsed) ? parsed : parsed.items;
  }

  /**
   * List the user's uploaded files (for the "Attach Files" picker).
   */
  public async listFilesAsync(): Promise<OpenWebUiFileSummary[]> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/files/"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = openWebUiFileListSchema.parse(await response.json());
    const files = Array.isArray(parsed) ? parsed : parsed.items;
    return files.map((file) => ({ id: file.id, name: file.meta?.name ?? file.filename ?? file.id }));
  }

  /**
   * List the files contained in a knowledge base (for the expandable picker).
   * The knowledge detail endpoint returns `files: null` on recent versions, so
   * we read the files list and filter by the base's collection id instead.
   */
  public async getKnowledgeFilesAsync(knowledgeId: string): Promise<OpenWebUiFileSummary[]> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/files/"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = openWebUiFileListSchema.parse(await response.json());
    const files = Array.isArray(parsed) ? parsed : parsed.items;
    return files
      .filter((file) => file.meta?.collection_name === knowledgeId)
      .map((file) => ({ id: file.id, name: file.meta?.name ?? file.filename ?? file.id }));
  }

  /**
   * List the user's notes (for the "Attach Notes" picker).
   */
  public async listNotesAsync(): Promise<OpenWebUiNote[]> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/notes/"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = openWebUiNoteListSchema.parse(await response.json());
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
    const response = await fetchWithTrustedCertificatesAsync(this.url(`/api/v1/notes/${noteId}`), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = openWebUiNoteSchema.parse(await response.json());
    return { id: parsed.id, title: parsed.title ?? "Untitled note", content: parsed.data?.content?.md ?? "" };
  }

  /**
   * Transcribe recorded audio to text (speech-to-text) for voice messages.
   */
  public async transcribeAudioAsync(filename: string, base64Content: string, contentType: string): Promise<string> {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(base64Content, "base64")], { type: contentType }), filename);

    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/audio/transcriptions"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: form,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return openWebUiTranscriptionSchema.parse(await response.json()).text;
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

    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/files/"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: form,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = openWebUiUploadedFileSchema.parse(await response.json());
    return { id: parsed.id, name: parsed.meta?.name ?? parsed.filename ?? filename };
  }

  /**
   * Ingest a web page into a temporary vector collection and return a handle to
   * retrieve from it. Open WebUI does not crawl URLs at completion time, so we
   * embed the page here and inject retrieved chunks ourselves at send time.
   */
  public async processWebAsync(url: string): Promise<OpenWebUiWebDocument> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/retrieval/process/web"), {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ url, collection_name: "" }),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = openWebUiProcessWebResponseSchema.parse(await response.json());
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

    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/retrieval/query/collection"), {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ collection_names: collectionNames, query, k }),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = openWebUiCollectionQueryResponseSchema.parse(await response.json());
    return (parsed.documents ?? []).flat();
  }

  /**
   * List the user's chats (native Open WebUI history).
   */
  public async listChatsAsync(): Promise<OpenWebUiChatListItem[]> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/chats/"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return openWebUiChatListItemSchema.array().parse(await response.json());
  }

  /**
   * Get a single chat including its messages.
   */
  public async getChatAsync(chatId: string): Promise<OpenWebUiChat> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(`/api/v1/chats/${chatId}`), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return openWebUiChatSchema.parse(await response.json());
  }

  /**
   * Create a new chat in the native history.
   */
  public async createChatAsync(payload: OpenWebUiChatPayload): Promise<OpenWebUiChat> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/chats/new"), {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ chat: payload }),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return openWebUiChatSchema.parse(await response.json());
  }

  /**
   * Update an existing chat in the native history.
   */
  public async updateChatAsync(chatId: string, payload: OpenWebUiChatPayload): Promise<OpenWebUiChat> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(`/api/v1/chats/${chatId}`), {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ chat: payload }),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return openWebUiChatSchema.parse(await response.json());
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
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/chat/completions"), {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ model: params.model, messages: params.messages, stream: true }),
      signal,
    });

    if (!response.ok || !response.body) {
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
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          onDelta(delta);
        }
      } catch {
        logger.debug("Failed to parse Open WebUI completion chunk", { line: trimmed });
      }
      return false;
    };

    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (processLine(line)) return;
        }
      }
    } finally {
      reader.cancel().catch(() => {
        // ignore cancellation errors during teardown
      });
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
  }
}
