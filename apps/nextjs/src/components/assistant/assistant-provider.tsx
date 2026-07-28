"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import type { MessageFormatAdapter, RemoteThreadListAdapter, ThreadHistoryAdapter, Toolkit } from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  defineToolkit,
  Tools,
  useAui,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { AssistantChatTransport, useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useHotkeys } from "@mantine/hooks";
import { createAssistantStream } from "assistant-stream";
import type { UIMessage } from "ai";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { z } from "zod/v4";

import { clientApi, fetchApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { hotkeys } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import {
  openMediaRequestSearch,
  openSpotlight,
  useRegisterSpotlightContextActions,
  useRegisterSpotlightContextResults,
} from "@homarr/spotlight";

import { AssistantPanel } from "./assistant-panel";

interface AssistantContextValue {
  enabled: boolean;
  opened: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export const useHomarrAssistant = () => {
  const value = useContext(AssistantContext);
  if (!value) {
    throw new Error("useHomarrAssistant must be used within AssistantProvider");
  }
  return value;
};

export const useOptionalHomarrAssistant = () => useContext(AssistantContext);

const threadAdapter: RemoteThreadListAdapter = {
  async list() {
    const threads = await fetchApi.assistant.listThreads.query();
    return {
      threads: threads.map((thread) => ({
        remoteId: thread.id,
        status: thread.status,
        title: thread.title ?? undefined,
        lastMessageAt: thread.updatedAt,
        custom: { modelId: thread.modelId },
      })),
    };
  },
  async initialize(localId) {
    const thread = await fetchApi.assistant.createThread.mutate({ localId });
    return { remoteId: thread.id, externalId: undefined };
  },
  async fetch(threadId) {
    const { thread } = await fetchApi.assistant.getThread.query({ threadId });
    return {
      remoteId: thread.id,
      status: thread.status,
      title: thread.title ?? undefined,
      lastMessageAt: thread.updatedAt,
      custom: { modelId: thread.modelId },
    };
  },
  async rename(threadId, title) {
    await fetchApi.assistant.renameThread.mutate({ threadId, title });
  },
  async archive(threadId) {
    await fetchApi.assistant.setThreadStatus.mutate({ threadId, status: "archived" });
  },
  async unarchive(threadId) {
    await fetchApi.assistant.setThreadStatus.mutate({ threadId, status: "regular" });
  },
  async delete(threadId) {
    await fetchApi.assistant.deleteThread.mutate({ threadId });
  },
  async generateTitle(_threadId, messages) {
    const firstUserMessage = messages.find((message) => message.role === "user");
    const text =
      firstUserMessage?.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ")
        .trim()
        .slice(0, 72) || "New conversation";
    return createAssistantStream((controller) => controller.appendText(text));
  },
};

const createHistoryAdapter = (threadId: string | undefined): ThreadHistoryAdapter => ({
  async load() {
    return { messages: [] };
  },
  async append() {
    // AI SDK runtimes use the typed adapter returned by withFormat below.
  },
  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ) {
    if (formatAdapter.format !== "ai-sdk/v6") {
      throw new Error(`Unsupported assistant message format: ${formatAdapter.format}`);
    }
    const storageFormat = formatAdapter.format;
    return {
      async load() {
        if (!threadId) return { messages: [] };
        const { messages } = await fetchApi.assistant.getThread.query({ threadId });
        return {
          messages: messages
            .filter((message) => message.format === formatAdapter.format)
            .map(
              (message) =>
                formatAdapter.decode({
                  id: message.id,
                  parent_id: message.parentId,
                  format: message.format,
                  content: message.content as TStorageFormat,
                }) as { parentId: string | null; message: TMessage },
            ),
        };
      },
      async append(item) {
        if (!threadId) return;
        await fetchApi.assistant.appendMessage.mutate({
          threadId,
          id: (formatAdapter as MessageFormatAdapter<unknown, TStorageFormat>).getId(item.message),
          parentId: item.parentId,
          format: storageFormat,
          content: (formatAdapter as MessageFormatAdapter<unknown, TStorageFormat>).encode(
            item as { parentId: string | null; message: unknown },
          ),
        });
      },
      async update(item, localMessageId) {
        if (!threadId) return;
        const erasedFormatAdapter = formatAdapter as MessageFormatAdapter<unknown, TStorageFormat>;
        const id = erasedFormatAdapter.getId(item.message);
        await fetchApi.assistant.appendMessage.mutate({
          threadId,
          id,
          parentId: item.parentId,
          format: storageFormat,
          content: erasedFormatAdapter.encode(item as { parentId: string | null; message: unknown }),
        });
        if (localMessageId !== id) {
          await fetchApi.assistant.deleteMessages.mutate({ threadId, ids: [localMessageId] });
        }
      },
      async delete(items) {
        if (!threadId || items.length === 0) return;
        await fetchApi.assistant.deleteMessages.mutate({
          threadId,
          ids: items.map((item) =>
            (formatAdapter as MessageFormatAdapter<unknown, TStorageFormat>).getId(item.message),
          ),
        });
      },
    };
  },
});

const AssistantThreadRuntime = () => {
  const localThreadId = useAuiState((state) => state.threadListItem.id);
  const threadId = useAuiState((state) => state.threadListItem.remoteId);
  const aui = useAui();
  const transport = useMemo(() => new AssistantChatTransport({ api: "/api/assistant/chat" }), []);
  const chat = useChat<UIMessage>({
    id: localThreadId,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const history = useMemo(() => createHistoryAdapter(threadId), [threadId]);
  const runtime = useAISDKRuntime(chat, { adapters: { history } });

  transport.setRuntime(runtime);
  transport["__internal_setGetThreadListItem"](() => (aui.threadListItem.source ? aui.threadListItem() : undefined));

  return runtime;
};

const AssistantRuntime = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const runtime = useRemoteThreadListRuntime({
    adapter: threadAdapter,
    runtimeHook: AssistantThreadRuntime,
  });

  const toolkit = useMemo(
    () =>
      defineToolkit({
        navigate_to_route: {
          type: "frontend",
          description:
            "Navigate the current Homarr tab to a safe internal route. Only paths beginning with a single slash are accepted.",
          parameters: z.object({
            path: z.string().describe("An internal Homarr route, for example /manage/apps"),
          }),
          execute: async ({ path }) => {
            if (!path.startsWith("/") || path.startsWith("//")) {
              return { success: false, error: "Only internal Homarr paths are allowed." };
            }
            router.push(path);
            return { success: true, path };
          },
          renderText: {
            running: ({ args }) => `Opening ${args.path}…`,
            complete: ({ args }) => `Opened ${args.path}`,
          },
        },
        open_command_menu: {
          type: "frontend",
          description: "Open Homarr's command and search menu.",
          parameters: z.object({}),
          execute: async () => {
            openSpotlight();
            return { success: true };
          },
          renderText: { running: "Opening command menu…", complete: "Command menu opened" },
        },
        open_media_request_search: {
          type: "frontend",
          description: "Open Homarr's media request search interface.",
          parameters: z.object({}),
          execute: async () => {
            openMediaRequestSearch();
            return { success: true };
          },
          renderText: { running: "Opening media search…", complete: "Media search opened" },
        },
      }) as Toolkit,
    [router],
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantTools toolkit={toolkit} />
      {children}
    </AssistantRuntimeProvider>
  );
};

const AssistantTools = ({ toolkit }: { toolkit: Toolkit }) => {
  useAui({ tools: Tools({ toolkit }) });
  return null;
};

export const AssistantProvider = ({ children }: PropsWithChildren) => {
  const t = useScopedI18n("common.assistant");
  const session = useSession();
  const [opened, setOpened] = useState(false);
  const { data } = clientApi.assistant.getAvailability.useQuery(undefined, {
    enabled: session.status === "authenticated",
    staleTime: 60_000,
  });
  const enabled = Boolean(data?.enabled && session.status === "authenticated");

  const open = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => setOpened((current) => !current), []);
  useHotkeys([[hotkeys.openAssistant, open]]);

  const spotlightItem = useMemo(
    () => ({
      id: "homarr-assistant",
      name: t("spotlight"),
      icon: "/logo/logo.png",
      interaction: () => ({ type: "javaScript" as const, onSelect: open }),
    }),
    [open, t],
  );
  useRegisterSpotlightContextResults("homarr-assistant", enabled ? [spotlightItem] : [], [enabled, spotlightItem]);
  useRegisterSpotlightContextActions("homarr-assistant", enabled ? [spotlightItem] : [], [enabled, spotlightItem]);

  const value = useMemo(() => ({ enabled, opened, open, close, toggle }), [close, enabled, open, opened, toggle]);

  return (
    <AssistantContext.Provider value={value}>
      {enabled ? (
        <AssistantRuntime>
          {children}
          <AssistantPanel opened={opened} onClose={close} />
        </AssistantRuntime>
      ) : (
        children
      )}
    </AssistantContext.Provider>
  );
};
