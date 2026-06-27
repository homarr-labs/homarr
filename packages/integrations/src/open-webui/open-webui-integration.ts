import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  OpenWebUiChat,
  OpenWebUiChatListItem,
  OpenWebUiChatMessage,
  OpenWebUiChatPayload,
  OpenWebUiModel,
} from "./open-webui-types";
import {
  openWebUiChatListItemSchema,
  openWebUiChatSchema,
  openWebUiCompletionChunkSchema,
  openWebUiModelsResponseSchema,
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
    params: { model: string; messages: OpenWebUiChatMessage[] },
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
