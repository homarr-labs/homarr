"use client";

import { useState } from "react";
import { ActionIcon, Box, Group, Image, Modal, Paper, Tooltip, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight, IconZoomIn } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";
import type { WorkshopBackend } from "@homarr/workshop/backend";

interface WorkshopScreenshotsProps {
  client: WorkshopBackend;
  submissionId: string;
  title: string;
  screenshots: string[];
}

/**
 * A large preview of the submission's screenshots with a thumbnail strip and a
 * click-to-zoom lightbox, so people can actually see what they are installing.
 */
export function WorkshopScreenshots({ client, submissionId, title, screenshots }: WorkshopScreenshotsProps) {
  const t = useScopedI18n("workshop");
  const [index, setIndex] = useState(0);
  const [zoomOpened, zoomControls] = useDisclosure(false);

  if (screenshots.length === 0) return null;

  const active = screenshots[Math.min(index, screenshots.length - 1)];
  if (!active) return null;

  const alt = (position: number) => t("screenshotAlt", { title, count: position + 1 });
  const step = (delta: number) => setIndex((current) => (current + delta + screenshots.length) % screenshots.length);

  return (
    <>
      <Paper withBorder radius="md" p={0} style={{ overflow: "hidden", position: "relative" }}>
        <UnstyledButton onClick={zoomControls.open} w="100%" aria-label={t("zoomScreenshot")}>
          <Image
            src={client.fileUrl(submissionId, active, "1200x800")}
            alt={alt(index)}
            fit="contain"
            h={{ base: 220, sm: 380 }}
            bg="var(--mantine-color-default-hover)"
          />
        </UnstyledButton>
        <Tooltip label={t("zoomScreenshot")}>
          <ActionIcon
            variant="default"
            size="lg"
            radius="md"
            pos="absolute"
            top={8}
            right={8}
            aria-label={t("zoomScreenshot")}
            onClick={zoomControls.open}
          >
            <IconZoomIn size={18} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
        {screenshots.length > 1 && (
          <>
            <ActionIcon
              variant="default"
              size="lg"
              radius="xl"
              pos="absolute"
              left={8}
              top="50%"
              style={{ transform: "translateY(-50%)" }}
              aria-label={t("previousScreenshot")}
              onClick={() => step(-1)}
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size="lg"
              radius="xl"
              pos="absolute"
              right={8}
              top="50%"
              style={{ transform: "translateY(-50%)" }}
              aria-label={t("nextScreenshot")}
              onClick={() => step(1)}
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </>
        )}
      </Paper>

      {screenshots.length > 1 && (
        <Group gap="xs" wrap="wrap">
          {screenshots.map((file, position) => (
            <UnstyledButton
              key={file}
              onClick={() => setIndex(position)}
              aria-label={alt(position)}
              aria-pressed={position === index}
            >
              <Box
                w={96}
                h={64}
                style={{
                  overflow: "hidden",
                  borderRadius: "var(--mantine-radius-sm)",
                  outline:
                    position === index
                      ? "2px solid var(--mantine-primary-color-filled)"
                      : "1px solid var(--mantine-color-default-border)",
                  opacity: position === index ? 1 : 0.65,
                }}
              >
                <Image src={client.fileUrl(submissionId, file, "192x128")} alt="" h={64} w={96} fit="cover" />
              </Box>
            </UnstyledButton>
          ))}
        </Group>
      )}

      <Modal
        opened={zoomOpened}
        onClose={zoomControls.close}
        size="auto"
        centered
        padding="xs"
        title={alt(index)}
        styles={{ body: { display: "flex", justifyContent: "center" } }}
      >
        <Image
          src={client.fileUrl(submissionId, active)}
          alt={alt(index)}
          fit="contain"
          mah="80dvh"
          style={{ maxWidth: "min(90vw, 1400px)" }}
        />
      </Modal>
    </>
  );
}
