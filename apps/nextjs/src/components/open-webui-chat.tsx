"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Drawer } from "@mantine/core";
import { useHotkeys, useMediaQuery } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { hotkeys } from "@homarr/definitions";
import { openWebUiChatEvent } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";
import { Chat } from "@homarr/widgets/_open-webui/chat";

/**
 * App-wide launcher for the Open WebUI chat. Renders a right-side panel that can
 * be opened from the header user menu, the {@link hotkeys.toggleAiChat} keybind,
 * or the spotlight "ask AI" mode (via the {@link openWebUiChatEvent} window
 * event). Renders nothing unless the signed-in user owns an Open WebUI
 * integration.
 */
export const OpenWebUiChat = () => {
  const t = useI18n();
  const { data: session } = useSession();
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [opened, setOpened] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);
  // Bumped on every open so the chat remounts and a fresh initial query is sent.
  const [openNonce, setOpenNonce] = useState(0);

  const { data: integrations = [] } = clientApi.integration.all.useQuery(undefined, {
    enabled: Boolean(session?.user?.id),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const myOpenWebUiIntegration = useMemo(() => {
    if (!session?.user?.id) return null;
    return integrations.find(
      (integration) => integration.kind === "openWebUi" && integration.creatorId === session.user.id,
    );
  }, [integrations, session?.user?.id]);

  const open = useCallback((query?: string) => {
    setInitialQuery(query?.trim() ? query.trim() : undefined);
    setOpenNonce((nonce) => nonce + 1);
    setOpened(true);
  }, []);

  const toggle = useCallback(() => {
    setOpened((previous) => {
      if (previous) return false;
      setInitialQuery(undefined);
      setOpenNonce((nonce) => nonce + 1);
      return true;
    });
  }, []);

  // Open (with an optional query) when the spotlight "ask AI" mode dispatches.
  useEffect(() => {
    const handler = (event: Event) => {
      if (!myOpenWebUiIntegration) return;
      open((event as CustomEvent<{ query?: string }>).detail?.query);
    };
    window.addEventListener(openWebUiChatEvent, handler);
    return () => window.removeEventListener(openWebUiChatEvent, handler);
  }, [open, myOpenWebUiIntegration]);

  useHotkeys([[hotkeys.toggleAiChat, () => myOpenWebUiIntegration && toggle()]]);

  if (!myOpenWebUiIntegration) return null;

  return (
    <Drawer
      opened={opened}
      onClose={() => setOpened(false)}
      position="right"
      size={isMobile ? "100%" : 480}
      title={t("widget.openWebUi.name")}
      keepMounted={false}
      styles={{
        body: {
          height: "calc(100dvh - 60px)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        },
      }}
    >
      <Box style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Chat
          key={openNonce}
          options={{ systemPrompt: "", showHistory: true }}
          integrationIds={[myOpenWebUiIntegration.id]}
          itemId={undefined}
          boardId={undefined}
          isEditMode={false}
          setOptions={() => {
            // No-op: options are fixed for the launcher chat.
          }}
          width={480}
          height={600}
          initialQuery={initialQuery}
        />
      </Box>
    </Drawer>
  );
};
