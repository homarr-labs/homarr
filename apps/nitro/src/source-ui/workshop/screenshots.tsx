import { useState } from "react";
import type { ComponentType } from "react";
import { ActionIcon, Alert, Box, Group, Image, Paper, Tooltip, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight, IconZoomIn } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import type { WorkshopLightboxProps } from "./contracts";

export function WorkshopScreenshots(props: {
  fileUrl(submissionId: string, filename: string, thumb?: string): string;
  submissionId: string;
  title: string;
  screenshots: string[];
  lightbox?: ComponentType<WorkshopLightboxProps>;
}) {
  return <ScreenshotGallery key={JSON.stringify([props.submissionId, props.screenshots])} {...props} />;
}

function ScreenshotGallery({
  fileUrl,
  submissionId,
  title,
  screenshots,
  lightbox: Lightbox,
}: {
  fileUrl(submissionId: string, filename: string, thumb?: string): string;
  submissionId: string;
  title: string;
  screenshots: string[];
  lightbox?: ComponentType<WorkshopLightboxProps>;
}) {
  const t = useI18n("workshop");
  const [index, setIndex] = useState(0);
  const [zoomOpened, zoomControls] = useDisclosure(false);
  if (screenshots.length === 0) return null;
  const currentIndex = Math.min(index, screenshots.length - 1);
  const active = screenshots[currentIndex];
  if (!active) return null;
  const alt = (position: number) => t("screenshotAlt", { title, count: position + 1 });
  const step = (delta: number) => setIndex((current) => (current + delta + screenshots.length) % screenshots.length);
  const slides = screenshots.map((file, position) => ({
    src: fileUrl(submissionId, file),
    thumbSrc: fileUrl(submissionId, file, "192x128"),
    alt: alt(position),
    caption: alt(position),
  }));
  return (
    <>
      <Paper withBorder radius="md" p={0} style={{ overflow: "hidden", position: "relative" }}>
        <UnstyledButton disabled={!Lightbox} onClick={zoomControls.open} w="100%" aria-label={t("zoomScreenshot")}>
          <Image
            src={fileUrl(submissionId, active, "1200x800")}
            alt={alt(currentIndex)}
            fit="contain"
            h={{ base: 220, sm: 380 }}
            bg="var(--mantine-color-default-hover)"
          />
        </UnstyledButton>
        <Tooltip label={t("zoomScreenshot")}>
          <ActionIcon
            disabled={!Lightbox}
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
              aria-pressed={position === currentIndex}
            >
              <Box
                w={96}
                h={64}
                style={{
                  overflow: "hidden",
                  borderRadius: "var(--mantine-radius-sm)",
                  outline:
                    position === currentIndex
                      ? "2px solid var(--mantine-primary-color-filled)"
                      : "1px solid var(--mantine-color-default-border)",
                  opacity: position === currentIndex ? 1 : 0.65,
                }}
              >
                <Image src={fileUrl(submissionId, file, "192x128")} alt="" h={64} w={96} fit="cover" />
              </Box>
            </UnstyledButton>
          ))}
        </Group>
      )}
      {!Lightbox && (
        <Alert color="yellow">
          Screenshot zoom is unavailable until the original lightbox and its stylesheet/provider are joined.
        </Alert>
      )}
      {Lightbox && (
        <Lightbox
          opened={zoomOpened}
          onClose={zoomControls.close}
          slides={slides}
          currentIndex={currentIndex}
          onIndexChange={setIndex}
          withNavigation={screenshots.length > 1}
          withThumbnails={screenshots.length > 1}
          withZoom
          withKeyboardEvents
          returnFocus
          loop={screenshots.length > 1}
          labels={{
            lightboxLabel: t("screenshotViewer", { title }),
            slideLabel: (position) => alt(position - 1),
            slidesLabel: t("screenshotsLabel", { title }),
            thumbnailLabel: (position) => alt(position - 1),
            previousSlideLabel: t("previousScreenshot"),
            nextSlideLabel: t("nextScreenshot"),
            showThumbnailsLabel: t("showScreenshotThumbnails"),
            hideThumbnailsLabel: t("hideScreenshotThumbnails"),
            closeLabel: t("closeScreenshotViewer"),
          }}
        />
      )}
    </>
  );
}
