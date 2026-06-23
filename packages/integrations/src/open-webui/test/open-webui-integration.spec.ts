import { Request, Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { OpenWebUiIntegration } from "../open-webui-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_API_KEY = "test-api-key-12345";
const TEST_URL = "https://openwebui.example.com";

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const asFetchResult = (response: Response) =>
  response as unknown as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>;

const setupMockFetch = (responses: Record<string, Record<string, unknown> | unknown[]>) => {
  mockFetch.mockImplementation((url) => {
    const urlString = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
    const path = new URL(urlString).pathname;

    if (path in responses) {
      return Promise.resolve(
        asFetchResult(
          new Response(JSON.stringify(responses[path]), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        ),
      );
    }

    return Promise.resolve(asFetchResult(new Response(JSON.stringify({ error: "Not Found" }), { status: 404 })));
  });
};

const streamFrom = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

const createIntegration = () =>
  new OpenWebUiIntegration({
    id: "test-open-webui",
    name: "Test Open WebUI",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: [{ kind: "apiKey", value: TEST_API_KEY }],
  });

describe("OpenWebUiIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getModelsAsync", () => {
    test("parses the OpenAI-compatible model list", async () => {
      setupMockFetch({
        "/api/models": { data: [{ id: "llama3" }, { id: "gpt-4o", name: "GPT-4o" }] },
      });

      const result = await createIntegration().getModelsAsync();

      expect(result).toEqual([{ id: "llama3" }, { id: "gpt-4o", name: "GPT-4o" }]);
      expect(mockFetch).toHaveBeenCalled();
    });

    test("sends the bearer token", async () => {
      setupMockFetch({ "/api/models": { data: [] } });

      await createIntegration().getModelsAsync();

      const headers = mockFetch.mock.calls.at(0)?.[1]?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBe(`Bearer ${TEST_API_KEY}`);
    });

    test("throws when the API returns an error", async () => {
      mockFetch.mockResolvedValue(asFetchResult(new Response("Unauthorized", { status: 401 })));

      await expect(createIntegration().getModelsAsync()).rejects.toThrow();
    });
  });

  describe("streamChatCompletionAsync", () => {
    test("emits each content delta and resolves on [DONE]", async () => {
      mockFetch.mockResolvedValue(
        asFetchResult(
          new Response(
            streamFrom([
              `data: ${JSON.stringify({ choices: [{ delta: { content: "Hel" } }] })}\n`,
              `data: ${JSON.stringify({ choices: [{ delta: { content: "lo" } }] })}\n`,
              "data: [DONE]\n",
            ]),
            { status: 200, headers: { "content-type": "text/event-stream" } },
          ),
        ),
      );

      const deltas: string[] = [];
      await createIntegration().streamChatCompletionAsync(
        { model: "llama3", messages: [{ role: "user", content: "Hi" }] },
        (delta) => deltas.push(delta),
        new AbortController().signal,
      );

      expect(deltas).toEqual(["Hel", "lo"]);
    });

    test("handles a delta split across stream chunks", async () => {
      const payload = JSON.stringify({ choices: [{ delta: { content: "world" } }] });
      const half = Math.floor(payload.length / 2);
      mockFetch.mockResolvedValue(
        asFetchResult(
          new Response(streamFrom([`data: ${payload.slice(0, half)}`, `${payload.slice(half)}\n`, "data: [DONE]\n"]), {
            status: 200,
          }),
        ),
      );

      const deltas: string[] = [];
      await createIntegration().streamChatCompletionAsync(
        { model: "llama3", messages: [{ role: "user", content: "Hi" }] },
        (delta) => deltas.push(delta),
        new AbortController().signal,
      );

      expect(deltas.join("")).toBe("world");
    });

    test("throws when the completion endpoint errors", async () => {
      mockFetch.mockResolvedValue(asFetchResult(new Response("Bad Gateway", { status: 502 })));

      await expect(
        createIntegration().streamChatCompletionAsync(
          { model: "llama3", messages: [{ role: "user", content: "Hi" }] },
          () => undefined,
          new AbortController().signal,
        ),
      ).rejects.toThrow();
    });
  });
});
