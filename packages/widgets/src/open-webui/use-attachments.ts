import { useState } from "react";

import { clientApi } from "@homarr/api/client";

import type {
  AttachView,
  ChatAttachment,
  FileAttachment,
  Grounding,
  ImageAttachment,
  NoteAttachment,
  WebAttachment,
} from "./chat-types";
import { extractChatMessages, readBlobAsDataUrl } from "./chat-utils";

interface UseAttachmentsOptions {
  integrationId: string | undefined;
  onError: (message: string) => void;
  errorMessages: { upload: string; web: string; note: string; chat: string };
}

/**
 * Owns every "ground the conversation" attachment source: inline vision images,
 * uploaded files, ingested web pages, knowledge bases, notes and referenced
 * chats — including the pickers' data, the toggle handlers, and assembling the
 * retrieval collections / verbatim context blocks sent with a completion.
 */
export function useAttachments({ integrationId, onError, errorMessages }: UseAttachmentsOptions) {
  // Images are inline per-message (vision); the rest are sticky context kept for
  // the conversation until removed.
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [knowledgeIds, setKnowledgeIds] = useState<string[]>([]);
  const [webItems, setWebItems] = useState<WebAttachment[]>([]);
  const [fileItems, setFileItems] = useState<FileAttachment[]>([]);
  const [noteItems, setNoteItems] = useState<NoteAttachment[]>([]);
  const [chatItems, setChatItems] = useState<ChatAttachment[]>([]);
  const [webInput, setWebInput] = useState("");
  const [attachOpened, setAttachOpened] = useState(false);
  const [attachView, setAttachView] = useState<AttachView>("root");

  const utils = clientApi.useUtils();
  const processWeb = clientApi.widget.openWebUi.processWeb.useMutation();
  const uploadFile = clientApi.widget.openWebUi.uploadFile.useMutation();

  const pickerQueryOptions = {
    enabled: Boolean(integrationId) && attachOpened,
    refetchOnWindowFocus: false,
    retry: false,
  } as const;
  const { data: knowledge = [] } = clientApi.widget.openWebUi.getKnowledge.useQuery(
    { integrationId: integrationId ?? "" },
    pickerQueryOptions,
  );
  const { data: files = [] } = clientApi.widget.openWebUi.getFiles.useQuery(
    { integrationId: integrationId ?? "" },
    pickerQueryOptions,
  );
  const { data: notes = [] } = clientApi.widget.openWebUi.getNotes.useQuery(
    { integrationId: integrationId ?? "" },
    pickerQueryOptions,
  );

  // Reset the popover to the root view whenever it closes.
  const openAttach = (open: boolean) => {
    setAttachOpened(open);
    if (!open) setAttachView("root");
  };

  // Upload Files: images become inline vision attachments; everything else is
  // uploaded to Open WebUI and grounded via retrieval.
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || !integrationId) return;
    for (const file of Array.from(fileList)) {
      try {
        const dataUrl = await readBlobAsDataUrl(file);
        if (file.type.startsWith("image/")) {
          setImages((previous) => [...previous, { name: file.name, dataUrl }]);
        } else {
          const contentBase64 = dataUrl.split(",")[1] ?? "";
          const uploaded = await uploadFile.mutateAsync({
            integrationId,
            filename: file.name,
            contentBase64,
            contentType: file.type || "application/octet-stream",
          });
          setFileItems((previous) =>
            previous.some((item) => item.id === uploaded.id) ? previous : [...previous, uploaded],
          );
        }
      } catch {
        onError(errorMessages.upload);
      }
    }
  };

  const addWebUrl = async () => {
    if (!integrationId) return;
    const raw = webInput.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setWebInput("");
    try {
      const document = await processWeb.mutateAsync({ integrationId, url });
      setWebItems((previous) =>
        previous.some((item) => item.collectionName === document.collectionName)
          ? previous
          : [...previous, { url, collectionName: document.collectionName, title: document.title }],
      );
      openAttach(false);
    } catch {
      onError(errorMessages.web);
    }
  };

  const toggleFile = (file: FileAttachment) =>
    setFileItems((previous) =>
      previous.some((item) => item.id === file.id)
        ? previous.filter((item) => item.id !== file.id)
        : [...previous, file],
    );

  // The list endpoint truncates note bodies, so fetch the full note on attach.
  const toggleNote = async (note: { id: string; title: string }) => {
    if (!integrationId) return;
    if (noteItems.some((item) => item.id === note.id)) {
      setNoteItems((previous) => previous.filter((item) => item.id !== note.id));
      return;
    }
    try {
      const full = await utils.widget.openWebUi.getNote.fetch({ integrationId, noteId: note.id });
      setNoteItems((previous) => [...previous, { id: full.id, title: full.title, content: full.content }]);
    } catch {
      onError(errorMessages.note);
    }
  };

  const toggleKnowledge = (id: string) =>
    setKnowledgeIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );

  const toggleChatReference = async (chat: { id: string; title?: string | null }) => {
    if (!integrationId) return;
    if (chatItems.some((item) => item.id === chat.id)) {
      setChatItems((previous) => previous.filter((item) => item.id !== chat.id));
      return;
    }
    try {
      const full = await utils.widget.openWebUi.getChat.fetch({ integrationId, chatId: chat.id });
      const transcript = extractChatMessages(full.chat)
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n");
      setChatItems((previous) => [...previous, { id: chat.id, title: chat.title ?? chat.id, transcript }]);
    } catch {
      onError(errorMessages.chat);
    }
  };

  const buildGrounding = (): Grounding => ({
    // Retrieval collections: knowledge bases (id), web pages and files.
    collections: [
      ...knowledgeIds,
      ...webItems.map((item) => item.collectionName),
      ...fileItems.map((item) => `file-${item.id}`),
    ],
    // Verbatim context: notes and referenced chats.
    contextTexts: [
      ...noteItems.map((note) => `Note "${note.title}":\n${note.content}`),
      ...chatItems.map((chat) => `Previous chat "${chat.title}":\n${chat.transcript}`),
    ],
  });

  const reset = () => {
    setImages([]);
    setKnowledgeIds([]);
    setWebItems([]);
    setFileItems([]);
    setNoteItems([]);
    setChatItems([]);
  };

  const hasAttachments =
    images.length > 0 ||
    knowledgeIds.length > 0 ||
    webItems.length > 0 ||
    fileItems.length > 0 ||
    noteItems.length > 0 ||
    chatItems.length > 0;

  return {
    // state
    images,
    setImages,
    knowledgeIds,
    webItems,
    setWebItems,
    fileItems,
    noteItems,
    chatItems,
    setChatItems,
    webInput,
    setWebInput,
    attachOpened,
    attachView,
    setAttachView,
    hasAttachments,
    // picker data
    knowledge,
    files,
    notes,
    // status
    isUploading: processWeb.isPending || uploadFile.isPending,
    isAddingWeb: processWeb.isPending,
    // handlers
    openAttach,
    handleFilesSelected,
    addWebUrl,
    toggleFile,
    toggleNote,
    toggleKnowledge,
    toggleChatReference,
    buildGrounding,
    reset,
  };
}
