import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type {
  OpenWebUiChat,
  OpenWebUiChatListItem,
  OpenWebUiFileSummary,
  OpenWebUiKnowledge,
  OpenWebUiModel,
  OpenWebUiNote,
} from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const openWebUiModelsRequestHandler = createIntegrationRequestHandler<
  OpenWebUiModel[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getModelsAsync();
  },
  cacheTtlMs: dayjs.duration(5, "minutes").asMilliseconds(),
});

export const openWebUiKnowledgeRequestHandler = createIntegrationRequestHandler<
  OpenWebUiKnowledge[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getKnowledgeAsync();
  },
  cacheTtlMs: dayjs.duration(5, "minutes").asMilliseconds(),
});

export const openWebUiKnowledgeFilesRequestHandler = createIntegrationRequestHandler<
  OpenWebUiFileSummary[],
  "openWebUi",
  { knowledgeId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getKnowledgeFilesAsync(input.knowledgeId);
  },
  cacheTtlMs: dayjs.duration(1, "minute").asMilliseconds(),
});

export const openWebUiFilesRequestHandler = createIntegrationRequestHandler<
  OpenWebUiFileSummary[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.listFilesAsync();
  },
  cacheTtlMs: dayjs.duration(30, "seconds").asMilliseconds(),
});

export const openWebUiNotesRequestHandler = createIntegrationRequestHandler<
  OpenWebUiNote[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.listNotesAsync();
  },
  cacheTtlMs: dayjs.duration(30, "seconds").asMilliseconds(),
});

export const openWebUiNoteRequestHandler = createIntegrationRequestHandler<
  OpenWebUiNote,
  "openWebUi",
  { noteId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getNoteAsync(input.noteId);
  },
  cacheTtlMs: dayjs.duration(30, "seconds").asMilliseconds(),
});

export const openWebUiChatsRequestHandler = createIntegrationRequestHandler<
  OpenWebUiChatListItem[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.listChatsAsync();
  },
  cacheTtlMs: dayjs.duration(15, "seconds").asMilliseconds(),
});

export const openWebUiChatRequestHandler = createIntegrationRequestHandler<
  OpenWebUiChat,
  "openWebUi",
  { chatId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getChatAsync(input.chatId);
  },
  cacheTtlMs: dayjs.duration(15, "seconds").asMilliseconds(),
});
