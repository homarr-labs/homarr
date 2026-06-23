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

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const openWebUiModelsRequestHandler = createCachedIntegrationRequestHandler<
  OpenWebUiModel[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getModelsAsync();
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "openWebUiModels",
});

export const openWebUiKnowledgeRequestHandler = createCachedIntegrationRequestHandler<
  OpenWebUiKnowledge[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getKnowledgeAsync();
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "openWebUiKnowledge",
});

export const openWebUiKnowledgeFilesRequestHandler = createCachedIntegrationRequestHandler<
  OpenWebUiFileSummary[],
  "openWebUi",
  { knowledgeId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getKnowledgeFilesAsync(input.knowledgeId);
  },
  cacheDuration: dayjs.duration(1, "minute"),
  queryKey: "openWebUiKnowledgeFiles",
});

export const openWebUiFilesRequestHandler = createCachedIntegrationRequestHandler<
  OpenWebUiFileSummary[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.listFilesAsync();
  },
  cacheDuration: dayjs.duration(30, "seconds"),
  queryKey: "openWebUiFiles",
});

export const openWebUiNotesRequestHandler = createCachedIntegrationRequestHandler<
  OpenWebUiNote[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.listNotesAsync();
  },
  cacheDuration: dayjs.duration(30, "seconds"),
  queryKey: "openWebUiNotes",
});

export const openWebUiChatsRequestHandler = createCachedIntegrationRequestHandler<
  OpenWebUiChatListItem[],
  "openWebUi",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.listChatsAsync();
  },
  cacheDuration: dayjs.duration(15, "seconds"),
  queryKey: "openWebUiChats",
});

export const openWebUiChatRequestHandler = createCachedIntegrationRequestHandler<
  OpenWebUiChat,
  "openWebUi",
  { chatId: string }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getChatAsync(input.chatId);
  },
  cacheDuration: dayjs.duration(15, "seconds"),
  queryKey: "openWebUiChat",
});
