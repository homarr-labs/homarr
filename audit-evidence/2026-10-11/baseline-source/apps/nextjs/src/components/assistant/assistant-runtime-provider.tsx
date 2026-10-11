"use client";

import type { ClipboardEvent, PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";
import type { AssistantRuntime, AttachmentAdapter, ThreadListRuntime, Toolkit } from "@assistant-ui/react";
import { AssistantRuntimeProvider, INTERNAL, Tools, useAui, useAuiEvent } from "@assistant-ui/react";

import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface AssistantRuntimeProviderWithToolsProps extends PropsWithChildren {
  runtime: AssistantRuntime;
  toolkit: Toolkit;
}

export const AssistantRuntimeProviderWithTools = ({
  children,
  runtime,
  toolkit,
}: AssistantRuntimeProviderWithToolsProps) => {
  const toolsAui = useAui({ tools: Tools({ toolkit }) });
  return (
    <AssistantRuntimeProvider aui={toolsAui} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

type ThreadCore = INTERNAL.ThreadRuntimeCore;
type ThreadCoreWithAdapters = ConstructorParameters<typeof INTERNAL.DefaultThreadComposerRuntimeCore>[0];
type ComposerConnectionDisposer = () => void;

export const assistantSurfaceComposerCacheLimit = 12;
const assistantSurfaceAttachmentLimit = 5;
const composerConnectionDisposers = new WeakMap<object, ComposerConnectionDisposer>();

class AssistantSurfaceComposerRuntimeCore extends INTERNAL.DefaultThreadComposerRuntimeCore {
  public override connect() {
    const dispose = super.connect();
    composerConnectionDisposers.set(this, dispose);
    return dispose;
  }

  public dispose() {
    composerConnectionDisposers.get(this)?.();
    composerConnectionDisposers.delete(this);
  }
}

interface AssistantSurfaceRuntime extends AssistantRuntime {
  dispose(): void;
}

interface AssistantSurfaceComposerEntry {
  composer: AssistantSurfaceComposerRuntimeCore;
  source: ThreadCore;
}

const getThreadAdapters = (threadCore: ThreadCore) => (threadCore as ThreadCoreWithAdapters).adapters;

const bindRuntimeValue = (target: object, property: PropertyKey, cache: WeakMap<object, Map<PropertyKey, unknown>>) => {
  const value = Reflect.get(target, property, target) as unknown;
  if (typeof value !== "function") return value;

  let targetCache = cache.get(target);
  if (!targetCache) {
    targetCache = new Map();
    cache.set(target, targetCache);
  }
  const cached = targetCache.get(property);
  if (cached) return cached;
  const bound = value.bind(target) as unknown;
  targetCache.set(property, bound);
  return bound;
};

const createSurfaceAttachmentAdapter = (threadCore: ThreadCore): AttachmentAdapter => {
  const pendingAttachmentIds = new Set<string>();
  let pendingAdds = 0;
  const getAdapter = () => {
    const adapter = getThreadAdapters(threadCore)?.attachments;
    if (!adapter) throw new Error("Attachments are not supported");
    return adapter;
  };

  return {
    get accept() {
      return getThreadAdapters(threadCore)?.attachments?.accept ?? "";
    },
    add({ file }) {
      if (pendingAttachmentIds.size + pendingAdds >= assistantSurfaceAttachmentLimit) {
        throw new Error(`A message can include up to ${assistantSurfaceAttachmentLimit} attachments.`);
      }

      pendingAdds += 1;
      let result: ReturnType<AttachmentAdapter["add"]>;
      try {
        result = getAdapter().add({ file });
      } catch (error) {
        pendingAdds -= 1;
        throw error;
      }

      if (Symbol.asyncIterator in result) {
        return (async function* () {
          let reservationPending = true;
          try {
            for await (const attachment of result) {
              if (reservationPending) {
                reservationPending = false;
                pendingAdds -= 1;
              }
              pendingAttachmentIds.add(attachment.id);
              yield attachment;
            }
          } finally {
            if (reservationPending) pendingAdds -= 1;
          }
        })();
      }

      return result.then(
        (attachment) => {
          pendingAdds -= 1;
          pendingAttachmentIds.add(attachment.id);
          return attachment;
        },
        (error: unknown) => {
          pendingAdds -= 1;
          throw error;
        },
      );
    },
    async remove(attachment) {
      try {
        await getAdapter().remove(attachment);
      } finally {
        pendingAttachmentIds.delete(attachment.id);
      }
    },
    async send(attachment) {
      try {
        return await getAdapter().send(attachment);
      } finally {
        pendingAttachmentIds.delete(attachment.id);
      }
    },
  };
};

const createSurfaceComposerHost = (
  threadCore: ThreadCore,
  boundRuntimeValues: WeakMap<object, Map<PropertyKey, unknown>>,
) => {
  const attachments = createSurfaceAttachmentAdapter(threadCore);
  const adapters = {
    get attachments() {
      return getThreadAdapters(threadCore)?.attachments ? attachments : undefined;
    },
  };

  return new Proxy(threadCore as ThreadCoreWithAdapters, {
    get(target, property) {
      if (property === "adapters") return adapters;
      return bindRuntimeValue(target, property, boundRuntimeValues);
    },
  });
};

/**
 * assistant-ui intentionally stores the thread composer on the thread runtime. That is the right
 * default for a single chat surface, but Homarr can render the same conversation in the floating
 * panel and in one or more board widgets at the same time. A second runtime-bound Lexical input
 * would otherwise mirror the first input's draft, attachments and selection.
 *
 * This adapter keeps the thread runtime itself shared and replaces only its composer core. The
 * local composer still delegates send/cancel to the shared thread, so messages, runs, tools,
 * branches and history remain one conversation. Composers are cached per conversation id because
 * some assistant-ui runtimes reuse the same underlying core while switching conversations.
 */
export const createAssistantSurfaceRuntime = (runtime: AssistantRuntime): AssistantSurfaceRuntime => {
  const sharedThread = runtime.thread as InstanceType<typeof INTERNAL.ThreadRuntimeImpl>;
  // oxlint-disable-next-line no-underscore-dangle -- assistant-ui exposes the binding only through its internal adapter API.
  const sharedBinding = sharedThread.__internal_threadBinding;
  const composerByConversation = new Map<string, AssistantSurfaceComposerEntry>();
  const surfaceCoreByConversation = new Map<string, { source: ThreadCore; surface: ThreadCore }>();
  const activeConversationCounts = new Map<string, number>();
  const boundRuntimeValues = new WeakMap<object, Map<PropertyKey, unknown>>();

  const disposeComposer = (conversationId: string, entry: AssistantSurfaceComposerEntry) => {
    const reset = entry.composer.reset();
    entry.composer.dispose();
    composerByConversation.delete(conversationId);
    surfaceCoreByConversation.delete(conversationId);
    void reset.catch(() => {});
  };

  const evictInactiveComposers = () => {
    while (composerByConversation.size > assistantSurfaceComposerCacheLimit) {
      let candidate: [string, AssistantSurfaceComposerEntry] | undefined;
      for (const entry of composerByConversation) {
        if (!activeConversationCounts.has(entry[0])) {
          candidate = entry;
          break;
        }
      }
      if (!candidate) return;
      disposeComposer(candidate[0], candidate[1]);
    }
  };

  const retainConversation = (conversationId: string) => {
    activeConversationCounts.set(conversationId, (activeConversationCounts.get(conversationId) ?? 0) + 1);
  };

  const releaseConversation = (conversationId: string) => {
    const count = activeConversationCounts.get(conversationId);
    if (count === undefined) return;
    if (count <= 1) activeConversationCounts.delete(conversationId);
    else activeConversationCounts.set(conversationId, count - 1);
    evictInactiveComposers();
  };

  const getComposer = (conversationId: string, threadCore: ThreadCore) => {
    const existing = composerByConversation.get(conversationId);
    if (existing?.source === threadCore) {
      composerByConversation.delete(conversationId);
      composerByConversation.set(conversationId, existing);
      return existing.composer;
    }
    const draft = existing
      ? {
          attachments: existing.composer.attachments,
          quote: existing.composer.quote,
          role: existing.composer.role,
          runConfig: existing.composer.runConfig,
          text: existing.composer.text,
        }
      : undefined;
    if (existing) disposeComposer(conversationId, existing);

    const host = createSurfaceComposerHost(threadCore, boundRuntimeValues);
    const composer = new AssistantSurfaceComposerRuntimeCore(host);
    composerByConversation.set(conversationId, { composer, source: threadCore });
    if (draft) {
      composer.setText(draft.text);
      composer.setRole(draft.role);
      composer.setRunConfig(draft.runConfig);
      composer.setQuote(draft.quote);
      for (const attachment of draft.attachments) {
        if (attachment.status.type === "complete" && attachment.content) {
          void composer
            .addAttachment({
              id: attachment.id,
              type: attachment.type,
              name: attachment.name,
              contentType: attachment.contentType,
              content: attachment.content,
            })
            .catch(() => {});
        } else if (attachment.file) {
          void composer.addAttachment(attachment.file).catch(() => {});
        }
      }
    }
    evictInactiveComposers();
    return composer;
  };

  const getSurfaceCore = (conversationId: string, threadCore: ThreadCore) => {
    const existing = surfaceCoreByConversation.get(conversationId);
    if (existing?.source === threadCore) return existing.surface;

    const composer = getComposer(conversationId, threadCore);
    const surfaceCore = new Proxy(threadCore, {
      get(target, property) {
        if (property === "composer") return composer;
        return bindRuntimeValue(target, property, boundRuntimeValues);
      },
    });
    surfaceCoreByConversation.set(conversationId, { source: threadCore, surface: surfaceCore });
    return surfaceCore;
  };

  const getConversationId = () => runtime.threads.mainItem.getState().id;

  const surfaceBinding: INTERNAL.ThreadRuntimeCoreBinding = {
    path: sharedBinding.path,
    getState: () => getSurfaceCore(getConversationId(), sharedBinding.getState()),
    outerSubscribe: (callback) => sharedBinding.outerSubscribe(callback),
    subscribe(callback) {
      let activeCore = sharedBinding.getState();
      let activeConversationId = getConversationId();
      let activeComposer = getComposer(activeConversationId, activeCore);
      retainConversation(activeConversationId);
      let unsubscribeComposer = activeComposer.subscribe(callback);
      const handleSharedUpdate = () => {
        const nextCore = sharedBinding.getState();
        const nextConversationId = getConversationId();
        if (nextCore !== activeCore || nextConversationId !== activeConversationId) {
          if (activeCore.speech !== undefined) activeCore.stopSpeaking();
          unsubscribeComposer();
          releaseConversation(activeConversationId);
          activeCore = nextCore;
          activeConversationId = nextConversationId;
          retainConversation(activeConversationId);
          activeComposer = getComposer(activeConversationId, activeCore);
          unsubscribeComposer = activeComposer.subscribe(callback);
        }
        callback();
      };
      const unsubscribeThread = sharedBinding.subscribe(handleSharedUpdate);
      const unsubscribeThreadItem = runtime.threads.mainItem.subscribe(handleSharedUpdate);
      return () => {
        unsubscribeComposer();
        releaseConversation(activeConversationId);
        unsubscribeThread();
        unsubscribeThreadItem();
      };
    },
  };

  const sharedMainItem = runtime.threads.mainItem;
  const mainItemBinding: INTERNAL.ThreadListItemRuntimeBinding = {
    path: sharedMainItem.path,
    getState: () => sharedMainItem.getState(),
    subscribe: (callback) => sharedMainItem.subscribe(callback),
  };
  const surfaceThread = new INTERNAL.ThreadRuntimeImpl(surfaceBinding, mainItemBinding);
  const sharedThreads = runtime.threads;
  const getSurfaceThreadById = (threadId: string) => {
    const requestedItem = sharedThreads.getItemById(threadId).getState();
    if (requestedItem.id === sharedMainItem.getState().id) return surfaceThread;
    // Homarr renders only the selected conversation. Preserve the upstream behavior for inactive
    // thread inspection without manufacturing another composer outside this surface's LRU cache.
    return sharedThreads.getById(threadId);
  };
  const surfaceThreads: ThreadListRuntime = {
    main: surfaceThread,
    mainItem: sharedMainItem,
    getState: () => sharedThreads.getState(),
    subscribe: (callback) => sharedThreads.subscribe(callback),
    getById: getSurfaceThreadById,
    getItemById: (threadId) => sharedThreads.getItemById(threadId),
    getItemByIndex: (index) => sharedThreads.getItemByIndex(index),
    getArchivedItemByIndex: (index) => sharedThreads.getArchivedItemByIndex(index),
    switchToThread: (threadId, options) => sharedThreads.switchToThread(threadId, options),
    switchToNewThread: () => sharedThreads.switchToNewThread(),
    getLoadThreadsPromise: () => sharedThreads.getLoadThreadsPromise(),
    reload: () => sharedThreads.reload(),
    reloadMainThread: () => sharedThreads.reloadMainThread(),
    loadMore: () => sharedThreads.loadMore(),
  };

  return {
    threads: surfaceThreads,
    thread: surfaceThread,
    // The root runtime already owns the inherited model-context client. Re-registering that same
    // provider for every surface would make one unmount remove it from the shared runtime's Set.
    registerModelContextProvider: () => () => {},
    dispose() {
      activeConversationCounts.clear();
      const threadCores = new Set([
        ...Array.from(surfaceCoreByConversation.values(), (entry) => entry.source),
        ...Array.from(composerByConversation.values(), (entry) => entry.source),
      ]);
      for (const threadCore of threadCores) {
        if (threadCore.speech !== undefined) threadCore.stopSpeaking();
      }
      for (const [conversationId, entry] of composerByConversation) disposeComposer(conversationId, entry);
    },
  };
};

interface AssistantComposerSurfaceValue {
  id: string;
}

const AssistantComposerSurfaceContext = createContext<AssistantComposerSurfaceValue | null>(null);

export const useAssistantComposerSurface = () => {
  const value = useContext(AssistantComposerSurfaceContext);
  if (!value) throw new Error("useAssistantComposerSurface must be used within AssistantComposerSurfaceBoundary");
  return value;
};

const surfaceElements = new Map<string, HTMLElement>();
let lastFocusedSurfaceElement: HTMLElement | null = null;
let lastFocusedSurfaceAt = 0;

interface AssistantSurfaceScrollPosition {
  element: HTMLElement;
  left: number;
  top: number;
}

const captureAssistantSurfaceScrollPositions = () => {
  const elements = new Set<HTMLElement>();
  for (const surfaceElement of surfaceElements.values()) {
    let element: HTMLElement | null = surfaceElement;
    while (element) {
      elements.add(element);
      element = element.parentElement;
    }
  }

  return Array.from(
    elements,
    (element): AssistantSurfaceScrollPosition => ({
      element,
      left: element.scrollLeft,
      top: element.scrollTop,
    }),
  );
};

const restoreAssistantSurfaceScrollPositions = (positions: AssistantSurfaceScrollPosition[]) => {
  for (const { element, left, top } of positions) {
    if (!element.isConnected) continue;
    element.scrollLeft = left;
    element.scrollTop = top;
  }
};

const getSurfaceIdForElement = (element: Element | null) => {
  if (!element) return null;
  for (const [surfaceId, surfaceElement] of surfaceElements) {
    if (surfaceElement.contains(element)) return surfaceId;
  }
  return null;
};

const getClipboardAttachmentName = (file: File, index: number) => {
  if (file.name.trim().length > 0) return file.name;
  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  return `pasted-file-${index + 1}.${extension}`;
};

const AssistantComposerSurfaceEvents = () => {
  const t = useI18n("assistant");
  useAuiEvent("composer.attachmentAddError", ({ message }) => {
    showErrorNotification({ title: t("attachments.errorTitle"), message });
  });
  return null;
};

export const AssistantComposerSurfaceBoundary = ({ children, surfaceId }: PropsWithChildren<{ surfaceId: string }>) => {
  const t = useI18n("assistant");
  const aui = useAui();
  const instanceId = useId();
  const resolvedSurfaceId = `${surfaceId}:${instanceId}`;
  const elementRef = useRef<HTMLDivElement>(null);
  const contextValue = useMemo(() => ({ id: resolvedSurfaceId }), [resolvedSurfaceId]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    surfaceElements.set(resolvedSurfaceId, element);

    return () => {
      if (surfaceElements.get(resolvedSurfaceId) === element) surfaceElements.delete(resolvedSurfaceId);
    };
  }, [resolvedSurfaceId]);

  const handlePasteCapture = (event: ClipboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest("[data-assistant-composer-input]")) return;
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;

    event.preventDefault();
    const composer = aui.composer();
    const acceptedTypes = new Set(
      composer
        .getState()
        .attachmentAccept.split(",")
        .map((type) => type.trim())
        .filter(Boolean),
    );

    files.forEach((file, index) => {
      if (
        file.type.startsWith("image/") &&
        !acceptedTypes.has("*") &&
        !acceptedTypes.has(file.type) &&
        !acceptedTypes.has("image/*")
      ) {
        showErrorNotification({
          title: t("attachments.errorTitle"),
          message: t("attachments.imageUnsupported"),
        });
        return;
      }
      const attachment =
        file.name.trim().length > 0
          ? file
          : new File([file], getClipboardAttachmentName(file, index), {
              type: file.type,
              lastModified: file.lastModified,
            });
      void composer.addAttachment(attachment).catch(() => {
        // The scoped composer event above presents the adapter's actionable error message.
      });
    });
  };

  return (
    <AssistantComposerSurfaceContext.Provider value={contextValue}>
      <div
        ref={elementRef}
        style={{ display: "contents" }}
        onFocusCapture={(event) => {
          if (!(event.target instanceof HTMLElement)) return;
          lastFocusedSurfaceElement = event.target;
          lastFocusedSurfaceAt = performance.now();
        }}
        onPasteCapture={handlePasteCapture}
      >
        {children}
      </div>
    </AssistantComposerSurfaceContext.Provider>
  );
};

/**
 * The current react-lexical FocusPlugin focuses every mounted composer when a run starts. Mount
 * this once above all surfaces so programmatic focus returns to the element/surface the user was
 * actually interacting with after those listeners have run.
 */
export const AssistantRunFocusPreserver = () => {
  useAuiEvent("thread.runStart", () => {
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Sending can briefly move focus to <body> while Lexical reconciles the editor. Retain the
    // last connected assistant input so the run still belongs to the surface the user submitted.
    const recentlyFocusedSurface = performance.now() - lastFocusedSurfaceAt < 1000;
    const focusedBeforeRun =
      activeElement && activeElement !== document.body
        ? activeElement
        : recentlyFocusedSurface && lastFocusedSurfaceElement?.isConnected
          ? lastFocusedSurfaceElement
          : activeElement;
    const surfaceIdBeforeRun = getSurfaceIdForElement(focusedBeforeRun);
    const scrollPositionsBeforeRun = captureAssistantSurfaceScrollPositions();
    let isRestoring = false;

    const restoreFocus = () => {
      if (isRestoring) return;
      const surfaceIdAfterRun = getSurfaceIdForElement(document.activeElement);
      const movedToAnotherSurface = surfaceIdAfterRun !== null && surfaceIdAfterRun !== surfaceIdBeforeRun;
      const leftInitiatingSurface = surfaceIdBeforeRun !== null && surfaceIdAfterRun !== surfaceIdBeforeRun;
      if (!movedToAnotherSurface && !leftInitiatingSurface) return;

      isRestoring = true;
      try {
        if (focusedBeforeRun?.isConnected) focusedBeforeRun.focus({ preventScroll: true });
        if (
          getSurfaceIdForElement(document.activeElement) !== surfaceIdBeforeRun &&
          document.activeElement instanceof HTMLElement
        ) {
          document.activeElement.blur();
        }
        // Focusing the other mounted Lexical composer may already have scrolled the dashboard or
        // one of its nested board containers. Put every assistant surface ancestor back before the
        // browser paints so a send from the floating panel never jumps to the board widget.
        restoreAssistantSurfaceScrollPositions(scrollPositionsBeforeRun);
      } finally {
        isRestoring = false;
      }
    };

    queueMicrotask(() => queueMicrotask(restoreFocus));
    requestAnimationFrame(restoreFocus);
  });
  return null;
};

/**
 * Gives every rendered assistant surface one shared local composer while preserving the shared
 * conversation. Individual surfaces should add AssistantComposerSurfaceBoundary around their UI.
 */
export const AssistantComposerRuntimeProvider = ({ children }: PropsWithChildren) => {
  const parentAui = useAui();
  // oxlint-disable-next-line no-underscore-dangle -- required to derive a scoped runtime without cloning the shared thread.
  const sharedRuntime = parentAui.threads().__internal_getAssistantRuntime?.();
  const surfaceRuntime = useMemo(() => {
    if (!sharedRuntime) throw new Error("Assistant runtime is not available for this composer surface");
    return createAssistantSurfaceRuntime(sharedRuntime);
  }, [sharedRuntime]);
  useEffect(() => () => surfaceRuntime.dispose(), [surfaceRuntime]);

  return (
    <AssistantRuntimeProvider aui={parentAui} runtime={surfaceRuntime}>
      <AssistantComposerSurfaceEvents />
      {children}
    </AssistantRuntimeProvider>
  );
};
