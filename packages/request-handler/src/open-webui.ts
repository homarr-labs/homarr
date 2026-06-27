import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type {
  OpenWebUiChat,
  OpenWebUiChatListItem,
  OpenWebUiKnowledge,
  OpenWebUiModel,
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
