import { Group, Text } from "@mantine/core";
import { IconRobot } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useScopedI18n } from "@homarr/translation/client";

import { createGroup } from "../../lib/group";
import { interaction } from "../../lib/interaction";
import { openWebUiChatEvent } from "../../spotlight-store";

interface AskAiOption {
  key: string;
  query: string;
}

// Opening the panel is decoupled from the app via a window event so the
// spotlight package doesn't depend on the Next.js app.
const dispatchOpenChat = (query: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<{ query?: string }>(openWebUiChatEvent, { detail: { query } }));
  }
};

// "Ask AI" — starts an Open WebUI conversation from the spotlight query.
export const askAiGroup = createGroup<AskAiOption>({
  keyPath: "key",
  title: (t) => t("search.mode.askAi.title"),
  Component: (option) => {
    const t = useScopedI18n("search.mode.askAi.group.ask");
    return (
      <Group px="md" py="xs" w="100%" wrap="nowrap" align="center">
        <IconRobot stroke={1.5} />
        <Text>{option.query ? t("startWithQuery", { query: option.query }) : t("hint")}</Text>
      </Group>
    );
  },
  useInteraction: interaction.javaScript((_option, query) => ({
    onSelect() {
      dispatchOpenChat(query);
    },
    closeSpotlightOnTrigger: true,
  })),
  useQueryOptions(query) {
    const { data: session } = useSession();
    const { data: integrations = [] } = clientApi.integration.all.useQuery(undefined, {
      enabled: Boolean(session?.user?.id),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    });
    const hasOpenWebUiIntegration = integrations.some(
      (integration) => integration.kind === "openWebUi" && integration.creatorId === session?.user?.id,
    );

    return {
      data: hasOpenWebUiIntegration ? [{ key: "ask-ai", query }] : [],
      isLoading: false,
      isError: false,
    };
  },
});
