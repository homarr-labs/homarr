"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useState } from "react";
import { MessagePartPrimitive } from "@assistant-ui/react";
import { Box, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { IconPhotoOff, IconRefresh } from "@tabler/icons-react";

import classes from "./assistant-image.module.css";

interface AssistantImageProps extends Omit<ComponentPropsWithoutRef<"img">, "src"> {
  source: string;
  messagePart?: boolean;
  caption?: string;
  loadingLabel: string;
  failedLabel: string;
  retryLabel: string;
}

/**
 * A bounded image preview shared by Markdown and assistant-ui image message parts. Message parts
 * deliberately render through MessagePartPrimitive.Image so their source remains connected to the
 * assistant-ui part context; the sanitized source prop overrides the raw part value.
 */
export const AssistantImage = ({
  source,
  messagePart = false,
  caption,
  loadingLabel,
  failedLabel,
  retryLabel,
  alt,
  className,
  ...imageProps
}: AssistantImageProps) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    setState("loading");
    setAttempt(0);
  }, [source]);

  const sharedProps = {
    ...imageProps,
    src: source,
    className,
    loading: "lazy" as const,
    decoding: "async" as const,
    referrerPolicy: "no-referrer" as const,
    onLoad: () => setState("loaded"),
    onError: () => setState("failed"),
  };

  return (
    <Box component="figure" className={classes.assistantImage} data-image-state={state}>
      <Box className={classes.assistantImageViewport}>
        {messagePart ? (
          <MessagePartPrimitive.Image key={attempt} {...sharedProps} alt={alt} />
        ) : (
          <img key={attempt} {...sharedProps} alt={alt} />
        )}
        {state === "loading" && (
          <Center component="output" className={classes.assistantImageStatus} aria-label={loadingLabel}>
            <Loader type="bars" size="sm" />
          </Center>
        )}
        {state === "failed" && (
          <Center className={classes.assistantImageStatus} role="alert">
            <Stack align="center" gap={6} p="sm">
              <IconPhotoOff size={22} aria-hidden />
              <Text size="xs" ta="center">
                {failedLabel}
              </Text>
              <Button
                size="compact-xs"
                variant="default"
                leftSection={<IconRefresh size={13} aria-hidden />}
                onClick={() => {
                  setState("loading");
                  setAttempt((value) => value + 1);
                }}
              >
                {retryLabel}
              </Button>
            </Stack>
          </Center>
        )}
      </Box>
      {caption && state === "loaded" && (
        <Text component="figcaption" className={classes.assistantImageCaption} size="xs" c="dimmed">
          {caption}
        </Text>
      )}
    </Box>
  );
};
