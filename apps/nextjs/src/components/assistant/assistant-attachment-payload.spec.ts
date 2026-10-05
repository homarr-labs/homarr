import type { UIMessage } from "ai";
import { describe, expect, test } from "vitest";

import { prepareAssistantMessagesForTransport, prepareAssistantRequestBody } from "./assistant-attachment-payload";

const routeRequestBudget = 12_000_000;
// A valid padded base64 payload that decodes to exactly the composer's 1,000,000-byte image limit.
const oneMegabyteBase64 = `${"A".repeat(1_333_334)}==`;

const createAttachmentTurn = (id: string, payloadMarker: string): UIMessage => ({
  id,
  role: "user",
  parts: [
    { type: "text", text: `Review attachments from ${id}` },
    ...Array.from({ length: 5 }, (_, index) => ({
      type: "file" as const,
      filename: `${id}-${index}.png`,
      mediaType: "image/png",
      url: `data:image/png;base64,${payloadMarker}${oneMegabyteBase64.slice(payloadMarker.length)}`,
    })),
  ],
});

describe("assistant attachment payload", () => {
  test("keeps five current attachments but removes historical bytes before a second heavy turn", () => {
    const firstMarker = "FIRSTPAYLOAD";
    const secondMarker = "SECONDPAYLOAD";
    const messages: UIMessage[] = [
      createAttachmentTurn("user-1", firstMarker),
      { id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "I reviewed the first set." }] },
      createAttachmentTurn("user-2", secondMarker),
    ];

    const preparedMessages = prepareAssistantMessagesForTransport(messages);
    const body = JSON.stringify({ id: "thread-1", messages: preparedMessages });

    expect(new TextEncoder().encode(body).byteLength).toBeLessThan(routeRequestBudget);
    expect(body).not.toContain(firstMarker);
    expect(body.match(/data:image\/png;base64,/gu)).toHaveLength(5);
    expect(body).toContain(secondMarker);
    expect(preparedMessages[0]?.parts).toContainEqual(
      expect.objectContaining({ type: "text", text: expect.stringContaining('"filename":"user-1-0.png"') }),
    );
    expect(messages[0]?.parts.filter((part) => part.type === "file")).toHaveLength(5);
    expect(JSON.stringify(messages[0])).toContain(firstMarker);
  });

  test("prunes the serialized transport envelope without changing its initialized thread id", () => {
    const originalBody = JSON.stringify({
      id: "remote-thread-id",
      reasoning: "auto",
      messages: [
        createAttachmentTurn("user-1", "OLDINLINEBYTES"),
        { id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "Done" }] },
        { id: "user-2", role: "user", parts: [{ type: "text", text: "Follow up" }] },
      ],
    });

    const prepared = prepareAssistantRequestBody(originalBody);

    expect(typeof prepared).toBe("string");
    expect(prepared).not.toContain("OLDINLINEBYTES");
    expect(JSON.parse(prepared as string)).toMatchObject({ id: "remote-thread-id", reasoning: "auto" });
  });

  test("keeps the active user turn available during an automatic assistant continuation", () => {
    const messages: UIMessage[] = [
      createAttachmentTurn("user-1", "ORIGINALTURNBYTES"),
      { id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "Calling a tool" }] },
    ];

    const prepared = prepareAssistantMessagesForTransport(messages);

    expect(JSON.stringify(prepared)).toContain("ORIGINALTURNBYTES");
    expect(prepared[0]?.parts.filter((part) => part.type === "file")).toHaveLength(5);
  });

  test("preserves hosted and provider-referenced files in historical messages", () => {
    const hostedPart = {
      type: "file" as const,
      filename: "report.pdf",
      mediaType: "application/pdf",
      url: "https://files.example.test/report.pdf",
    };
    const providerPart = {
      type: "file" as const,
      filename: "provider-report.pdf",
      mediaType: "application/pdf",
      url: "",
      providerReference: { openai: "file-1" },
    };
    const messages: UIMessage[] = [
      { id: "user-1", role: "user", parts: [hostedPart, providerPart] },
      { id: "assistant-1", role: "assistant", parts: [{ type: "text", text: "Done" }] },
      { id: "user-2", role: "user", parts: [{ type: "text", text: "Follow up" }] },
    ];

    const prepared = prepareAssistantMessagesForTransport(messages);

    expect(prepared[0]?.parts).toEqual([hostedPart, providerPart]);
  });
});
