import { useEffect, useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";

import type { ChatMessage, CompletionMessage, Grounding } from "./chat-types";
import { extractChatMessages, toCompletionMessages } from "./chat-utils";

interface UseChatStreamOptions {
  integrationId: string | undefined;
  model: string | null;
  setModel: (model: string) => void;
  systemPrompt: string;
  buildGrounding: () => Grounding;
  setError: (message: string | null) => void;
  onChatLoaded: () => void;
  newChatTitle: string;
}

/**
 * Owns the conversation itself: the streamed completion subscription, the
 * in-memory message list, persistence to Open WebUI's native history, and the
 * send / retry / stop / new-chat transitions.
 */
export function useChatStream({
  integrationId,
  model,
  setModel,
  systemPrompt,
  buildGrounding,
  setError,
  onChatLoaded,
  newChatTitle,
}: UseChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<CompletionMessage[]>([]);
  const [pendingCollections, setPendingCollections] = useState<string[]>([]);
  const [pendingContextTexts, setPendingContextTexts] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const messagesRef = useRef<ChatMessage[]>([]);
  const streamingTextRef = useRef("");
  // Read inside the serialized persist loop so a burst of turns reuses the chat
  // created by the first write instead of racing on the not-yet-committed state.
  const activeChatIdRef = useRef<string | null>(null);
  const persistInFlightRef = useRef(false);
  const pendingPersistRef = useRef<ChatMessage[] | null>(null);

  const utils = clientApi.useUtils();
  const createChat = clientApi.widget.openWebUi.createChat.useMutation();
  const updateChat = clientApi.widget.openWebUi.updateChat.useMutation();

  const { data: loadedChat } = clientApi.widget.openWebUi.getChat.useQuery(
    { integrationId: integrationId ?? "", chatId: selectedChatId ?? "" },
    { enabled: Boolean(integrationId) && Boolean(selectedChatId) },
  );

  // Hydrate the conversation when a history chat finishes loading.
  useEffect(() => {
    if (!loadedChat) return;
    const loadedMessages = extractChatMessages(loadedChat.chat);
    setMessages(loadedMessages);
    messagesRef.current = loadedMessages;
    setActiveChatId(loadedChat.id);
    activeChatIdRef.current = loadedChat.id;
    if (loadedChat.chat?.models?.[0]) setModel(loadedChat.chat.models[0]);
    onChatLoaded();
  }, [loadedChat, setModel, onChatLoaded]);

  const runPersist = async (finalMessages: ChatMessage[]) => {
    if (!integrationId || !model) return;
    // Native history stores plain text; image data URLs are dropped on persist.
    const title = finalMessages.find((message) => message.role === "user")?.content.slice(0, 80) ?? newChatTitle;
    const payload = {
      title,
      models: [model],
      messages: finalMessages.map(({ role, content }) => ({ role, content })),
    };
    try {
      const chatId = activeChatIdRef.current;
      if (chatId) {
        await updateChat.mutateAsync({ integrationId, chatId, chat: payload });
      } else {
        const chat = await createChat.mutateAsync({ integrationId, ...payload });
        activeChatIdRef.current = chat.id;
        setActiveChatId(chat.id);
      }
      await utils.widget.openWebUi.getChats.invalidate({ integrationId });
    } catch {
      // Persistence is best-effort; the conversation remains usable in-memory.
    }
  };

  // Open WebUI's chat endpoint replaces the whole chat object, so each turn
  // re-sends the full transcript. Serialize the writes and collapse a burst into
  // a single trailing save of the latest messages so turns don't stack
  // concurrent POSTs (or create duplicate chats on the first save).
  const persistChat = async (finalMessages: ChatMessage[]) => {
    if (persistInFlightRef.current) {
      pendingPersistRef.current = finalMessages;
      return;
    }
    persistInFlightRef.current = true;
    try {
      let next: ChatMessage[] | null = finalMessages;
      while (next) {
        pendingPersistRef.current = null;
        await runPersist(next);
        next = pendingPersistRef.current;
      }
    } finally {
      persistInFlightRef.current = false;
    }
  };

  const clearPending = () => {
    setPendingMessages([]);
    setPendingCollections([]);
    setPendingContextTexts([]);
  };

  const finalizeAssistantMessage = (stopped = false) => {
    const finalText = streamingTextRef.current;
    if (finalText.length > 0) {
      const finalMessages = [...messagesRef.current, { role: "assistant" as const, content: finalText }];
      setMessages(finalMessages);
      messagesRef.current = finalMessages;
      // A user-stopped reply is kept on screen but not written to history as a
      // finished turn; a later real turn will persist the whole conversation.
      if (!stopped) void persistChat(finalMessages);
    }
    streamingTextRef.current = "";
    setStreamingText("");
    setIsStreaming(false);
    clearPending();
  };

  clientApi.widget.openWebUi.sendMessage.useSubscription(
    {
      integrationId: integrationId ?? "",
      model: model ?? "",
      messages: pendingMessages,
      collections: pendingCollections.length > 0 ? pendingCollections : undefined,
      contextTexts: pendingContextTexts.length > 0 ? pendingContextTexts : undefined,
    },
    {
      enabled: isStreaming && pendingMessages.length > 0,
      onData: (event) => {
        if (event.type === "delta") {
          streamingTextRef.current += event.content;
          setStreamingText(streamingTextRef.current);
        } else if (event.type === "done") {
          finalizeAssistantMessage();
        } else if (event.type === "error") {
          setError(event.message);
          finalizeAssistantMessage();
        }
      },
      onError: (err) => {
        setError(err.message);
        finalizeAssistantMessage();
      },
    },
  );

  // Kick off a completion for the given conversation (ending with a user message).
  // Shared by sending a new message and retrying after a failure.
  const startCompletion = (baseMessages: ChatMessage[]) => {
    if (!model || !integrationId) return;
    setError(null);

    const trimmedSystemPrompt = systemPrompt.trim();
    const payloadMessages: ChatMessage[] = trimmedSystemPrompt
      ? [{ role: "system", content: trimmedSystemPrompt }, ...baseMessages]
      : baseMessages;

    const grounding = buildGrounding();

    streamingTextRef.current = "";
    setStreamingText("");
    setPendingMessages(toCompletionMessages(payloadMessages));
    setPendingCollections(grounding.collections);
    setPendingContextTexts(grounding.contextTexts);
    setIsStreaming(true);
  };

  const send = (userMessage: ChatMessage) => {
    const nextMessages = [...messagesRef.current, userMessage];
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    startCompletion(nextMessages);
  };

  // Retry the last turn after a failure: drop any partial assistant reply and
  // re-run the completion from the most recent user message.
  const retry = () => {
    if (isStreaming) return;
    const lastUserIndex = messagesRef.current.findLastIndex((message) => message.role === "user");
    if (lastUserIndex === -1) return;

    const truncated = messagesRef.current.slice(0, lastUserIndex + 1);
    setMessages(truncated);
    messagesRef.current = truncated;
    startCompletion(truncated);
  };

  const reset = () => {
    setMessages([]);
    messagesRef.current = [];
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setSelectedChatId(null);
    streamingTextRef.current = "";
    setStreamingText("");
    setIsStreaming(false);
    clearPending();
  };

  return {
    messages,
    streamingText,
    isStreaming,
    activeChatId,
    selectedChatId,
    setSelectedChatId,
    send,
    retry,
    stop: () => finalizeAssistantMessage(true),
    reset,
  };
}
