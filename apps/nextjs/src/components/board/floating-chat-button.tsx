"use client";

import { useMemo } from "react";
import { ActionIcon, Box, Dialog, Modal } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconRobot } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useI18n } from "@homarr/translation/client";
import { Chat } from "@homarr/widgets/_open-webui/chat";

export const FloatingChatButton = () => {
  const t = useI18n();
  const { data: session } = useSession();
  const [opened, { open, close }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const { data: integrations = [] } = clientApi.integration.all.useQuery(undefined, {
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Find the first OpenWebUI integration where the current user is the creator.
  const myOpenWebUiIntegration = useMemo(() => {
    if (!session?.user?.id) return null;
    return integrations.find(
      (integration) => integration.kind === "openWebUi" && integration.creatorId === session.user.id,
    );
  }, [integrations, session?.user?.id]);

  if (!myOpenWebUiIntegration) return null;

  return (
    <>
      {!opened && (
        <ActionIcon
          size={56}
          radius="xl"
          variant="filled"
          onClick={open}
          aria-label={t("widget.openWebUi.name")}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            boxShadow: "var(--mantine-shadow-lg)",
          }}
        >
          <IconRobot size={28} />
        </ActionIcon>
      )}

      {isMobile ? (
        <Modal
          opened={opened}
          onClose={close}
          title={t("widget.openWebUi.name")}
          fullScreen
          styles={{
            body: {
              height: "calc(100dvh - 60px)",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          <Box style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Chat
              options={{
                systemPrompt: "",
                showHistory: true,
              }}
              integrationIds={[myOpenWebUiIntegration.id]}
              itemId={undefined}
              boardId={undefined}
              isEditMode={false}
              setOptions={() => {
                // No-op: options are fixed for the floating chat.
              }}
              width={800}
              height={600}
            />
          </Box>
        </Modal>
      ) : (
        <Dialog
          opened={opened}
          onClose={close}
          withCloseButton
          size="35vw"
          position={{ bottom: 100, right: 24 }}
          transitionProps={{ transition: "pop-top-right", duration: 200 }}
          styles={{
            root: {
              height: "50dvh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden",
            },
            closeButton: {
              zIndex: 10,
            },
          }}
        >
          <Box style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Chat
              options={{
                systemPrompt: "",
                showHistory: true,
              }}
              integrationIds={[myOpenWebUiIntegration.id]}
              itemId={undefined}
              boardId={undefined}
              isEditMode={false}
              setOptions={() => {
                // No-op: options are fixed for the floating chat.
              }}
              width={800}
              height={600}
            />
          </Box>
        </Dialog>
      )}
    </>
  );
};
