"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  ActionIcon,
  Accordion,
  Alert,
  Box,
  Button,
  CopyButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconArrowsMove,
  IconBrandCss3,
  IconBrandDiscord,
  IconBrandGithub,
  IconCheck,
  IconCopy,
  IconDatabaseExport,
  IconExternalLink,
  IconHeartHandshake,
  IconRobot,
  IconRocket,
  IconTerminal2,
  IconWand,
  IconX,
} from "@tabler/icons-react";

import { setClientCookie } from "@homarr/common";
import { createModal, useModalAction } from "@homarr/modals";

import { BackupExportButton } from "~/components/backup";
import { discordInviteUrl, v2BetaBlogUrl, v2BetaDiscussionUrl, v2BetaFeedbackUrl, v2BetaPreviewUrl } from "./constants";
import classes from "./v2-beta-announcement.module.css";

const diffLineClassNames = {
  added: classes.diffLine_added,
  context: classes.diffLine_context,
  removed: classes.diffLine_removed,
} as const;

const composeDiffLines = [
  { kind: "context", value: " services:" },
  { kind: "context", value: "   homarr:" },
  { kind: "added", value: "+    image: ghcr.io/homarr-labs/homarr-test:v2" },
  { kind: "removed", value: "-    image: ghcr.io/homarr-labs/homarr:latest" },
  { kind: "context", value: "     ports:" },
  { kind: "context", value: '       - "7575:7575"' },
  { kind: "context", value: "     volumes:" },
  { kind: "context", value: "       - homarr-v2:/appdata" },
  { kind: "context", value: "     environment:" },
  { kind: "context", value: "       SECRET_ENCRYPTION_KEY: <SECRET_KEY>" },
  { kind: "added", value: "+      WORKSHOP_API_URL: https://v2.preview.homarr.dev/ # Only during the beta" },
  { kind: "context", value: "" },
  { kind: "context", value: " volumes:" },
  { kind: "context", value: "   homarr-v2:" },
] as const;

const v2ComposeFile = `services:
  homarr:
    image: ghcr.io/homarr-labs/homarr-test:v2
    ports:
      - "7575:7575"
    volumes:
      - homarr-v2:/appdata
    environment:
      SECRET_ENCRYPTION_KEY: <SECRET_KEY>
      WORKSHOP_API_URL: https://v2.preview.homarr.dev/ # Only during the beta

volumes:
  homarr-v2:
`;

interface V2BetaAnnouncementProps {
  canExportBackup: boolean;
  dismissalCookieName: string;
  onDismiss: () => void;
}

export const V2BetaAnnouncement = ({ canExportBackup, dismissalCookieName, onDismiss }: V2BetaAnnouncementProps) => {
  const { openModal } = useModalAction(V2BetaAnnouncementModal);

  const dismiss = () => {
    setClientCookie(dismissalCookieName, "dismissed", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: window.location.protocol === "https:",
    });
    onDismiss();
  };

  return (
    <Box component="aside" className={classes.banner} aria-label="Homarr v2 beta announcement">
      <Group h="100%" justify="space-between" gap="sm" wrap="nowrap" px="md">
        <Box className={classes.copy}>
          <Text fw={750} size="sm" truncate>
            We&apos;ve been cooking, Homarr v2 beta is here
          </Text>
          <Text className={classes.subtitle} visibleFrom="sm" size="xs" truncate>
            Custom Widgets &amp; CSS workshop, new drag-and-drop, new container system, side-bars are back, new widgets
            and so much more, come check it out and help us make v2 ready for everyone
          </Text>
        </Box>

        <Group gap={6} wrap="nowrap">
          <Button variant="white" color="red" size="compact-sm" onClick={() => openModal({ canExportBackup })}>
            Explore v2
          </Button>
          <ActionIcon variant="subtle" color="white" onClick={dismiss} aria-label="Dismiss the v2 beta announcement">
            <IconX size={18} />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  );
};

interface V2BetaAnnouncementModalProps {
  canExportBackup: boolean;
}

const V2BetaAnnouncementModal = createModal<V2BetaAnnouncementModalProps>(({ innerProps }) => {
  const [openedSection, setOpenedSection] = useState<string | null>("workshop");

  return (
    <Stack gap="lg">
      <Paper className={classes.modalHero} p={{ base: "lg", sm: "xl" }} radius="md">
        <Stack gap="sm" maw={760}>
          <Title order={2}>Help us get Homarr v2 ready</Title>
          <Text>
            There is no release date yet. Homarr v2 will become the default when it is ready—and we need you to test it
            and share feedback before we can be confident enough to make that switch.
          </Text>
        </Stack>
      </Paper>

      <Accordion variant="separated" radius="md" value={openedSection} onChange={setOpenedSection}>
        <FeatureAccordionItem value="workshop" icon={<IconBrandCss3 size={20} />} title="Homarr Workshop">
          Share and discover Custom Widgets and CSS made by the Homarr community.
        </FeatureAccordionItem>
        <FeatureAccordionItem
          value="drag-and-drop"
          icon={<IconArrowsMove size={20} />}
          title="Complete drag-and-drop rewrite"
        >
          Move, resize, multi-select, and arrange your dashboard with a board editor rebuilt from the ground up.
        </FeatureAccordionItem>
        <FeatureAccordionItem value="custom-widgets" icon={<IconWand size={20} />} title="Custom Widgets v2">
          We think you can make almost any widget with live previews, API requests, options, actions, and validation.
        </FeatureAccordionItem>
        <FeatureAccordionItem value="assistant" icon={<IconRobot size={20} />} title="Homarr Assistant">
          Ask questions, find what you need, and manage Homarr through permission-aware tools.
        </FeatureAccordionItem>
        <Accordion.Item value="installation">
          <Accordion.Control
            icon={
              <ThemeIcon variant="light" color="red" radius="md" size="lg">
                <IconTerminal2 size={20} />
              </ThemeIcon>
            }
            aria-label="Test Homarr v2 on your server"
          >
            <Box>
              <Text fw={750}>Test Homarr v2 on your server</Text>
              <Text c="dimmed" size="xs">
                Back up this instance, then update your Docker Compose file.
              </Text>
            </Box>
          </Accordion.Control>
          <Accordion.Panel>
            <V2BetaInstallInstructions canExportBackup={innerProps.canExportBackup} />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Alert variant="light" color="red" icon={<IconHeartHandshake size={22} />} title="Your testing is essential">
        Everyone uses Homarr in a different way. We’re counting on you to tell us anything that breaks or doesn’t feel
        right with this new version. Every report matters.
      </Alert>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <Button
          component="a"
          href={v2BetaPreviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          size="md"
          leftSection={<IconRocket size={18} />}
        >
          Try the hosted preview
        </Button>
        <Button
          component="a"
          href={v2BetaBlogUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          size="md"
          rightSection={<IconExternalLink size={16} />}
        >
          See everything new
        </Button>
        <Button
          component="a"
          href={discordInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          size="md"
          leftSection={<IconBrandDiscord size={18} />}
        >
          Join us on Discord
        </Button>
      </SimpleGrid>

      <Button
        component="a"
        href={v2BetaFeedbackUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="light"
        color="red"
        size="md"
        leftSection={<IconBrandGithub size={18} />}
      >
        Report anything that breaks or feels wrong
      </Button>

      <Group justify="space-between" align="center">
        <Text c="dimmed" size="xs" maw={720}>
          Please use a separate volume for the beta and keep a backup of your current Homarr data.
        </Text>
        <Button
          component="a"
          href={v2BetaDiscussionUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="subtle"
          size="compact-sm"
          rightSection={<IconExternalLink size={15} />}
        >
          Follow v2 development
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle: "Homarr v2 beta",
  size: 1000,
  centered: true,
});

interface V2BetaInstallInstructionsProps {
  canExportBackup: boolean;
}

const V2BetaInstallInstructions = ({ canExportBackup }: V2BetaInstallInstructionsProps) => (
  <Stack gap="lg">
    <Alert color="yellow" title="Keep your current Homarr data safe">
      Run the beta with the separate <code>homarr-v2</code> volume shown below. Keep a backup, and do not point this
      prerelease image at the only copy of your production data.
    </Alert>

    {canExportBackup ? (
      <Paper withBorder p="md" radius="md">
        <Stack gap="sm">
          <Group gap="sm">
            <IconDatabaseExport size={22} />
            <Title order={4}>Back up this Homarr instance</Title>
          </Group>
          <Text c="dimmed" size="sm">
            Download a full backup before testing v2. The archive contains sensitive data, so keep it somewhere safe.
          </Text>
          <BackupExportButton />
        </Stack>
      </Paper>
    ) : (
      <Alert color="blue" title="Back up your database before continuing">
        Direct backup downloads are available here to Homarr administrators using SQLite. If you use MySQL or
        PostgreSQL, back up the database with its own tools before testing v2.
      </Alert>
    )}

    <Stack gap="xs">
      <Title order={3}>Update your Docker Compose file</Title>
      <Text c="dimmed" size="sm">
        Replace the current image and add the beta-only Workshop URL. The complete example below can be copied as a
        starting point.
      </Text>
    </Stack>

    <Paper withBorder radius="md" className={classes.diffViewer}>
      <Group justify="space-between" px="md" py="sm" className={classes.diffHeader}>
        <Group gap="xs">
          <IconTerminal2 size={17} />
          <Text fw={700} size="sm">
            docker-compose.yml
          </Text>
        </Group>
        <CopyButton value={v2ComposeFile} timeout={2000}>
          {({ copied, copy }) => (
            <Button
              variant="subtle"
              color="gray"
              size="compact-sm"
              leftSection={copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
              onClick={copy}
            >
              {copied ? "Copied" : "Copy file"}
            </Button>
          )}
        </CopyButton>
      </Group>
      <Box component="pre" className={classes.diffCode} aria-label="Docker Compose changes for Homarr v2 beta">
        {composeDiffLines.map((line, index) => (
          <Box component="span" className={diffLineClassNames[line.kind]} key={`${line.kind}-${index}`}>
            {line.value || " "}
          </Box>
        ))}
      </Box>
    </Paper>

    <Text c="dimmed" size="xs">
      Replace <code>&lt;SECRET_KEY&gt;</code> with your existing encryption key. The Workshop URL is only required while
      the beta uses the preview Workshop.
    </Text>
  </Stack>
);

interface FeatureAccordionItemProps {
  value: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

const FeatureAccordionItem = ({ value, icon, title, children }: FeatureAccordionItemProps) => (
  <Accordion.Item value={value}>
    <Accordion.Control
      icon={
        <ThemeIcon variant="light" color="red" radius="md" size="lg">
          {icon}
        </ThemeIcon>
      }
      aria-label={title}
    >
      <Text fw={750}>{title}</Text>
    </Accordion.Control>
    <Accordion.Panel>
      <Box pl={48}>
        <Text c="dimmed" size="sm">
          {children}
        </Text>
      </Box>
    </Accordion.Panel>
  </Accordion.Item>
);
