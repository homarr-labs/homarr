"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Group, Loader, ScrollArea, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

interface DockerLogsModalInnerProps {
  id: string;
  name: string;
  tail?: number;
}

const SCROLL_THRESHOLD = 100;

const isViewportAtBottom = (viewport: HTMLDivElement | null): boolean => {
  if (!viewport) return false;
  return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < SCROLL_THRESHOLD;
};

export const DockerLogsModal = createModal<DockerLogsModalInnerProps>(({ innerProps }) => {
  const t = useI18n();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shouldScrollRef = useRef(true);
  const hasInitializedRef = useRef(false);

  // Get initial logs
  const { data: initialData } = clientApi.docker.logs.useQuery(
    { id: innerProps.id, tail: innerProps.tail ?? 200 },
    {
      refetchOnWindowFocus: false,
      retry: 0,
    },
  );

  // Subscribe to streaming logs
  clientApi.docker.subscribeLogs.useSubscription(
    { id: innerProps.id, tail: innerProps.tail ?? 200 },
    {
      onData(data) {
        setLogs((prev) => prev + data);
        setIsLoading(false);
      },
      onError(err) {
        setError(err.message);
        setIsLoading(false);
      },
    },
  );

  // Initialize with static logs (only once)
  useEffect(() => {
    if (initialData?.logs && !hasInitializedRef.current) {
      setLogs(initialData.logs);
      setIsLoading(false);
      hasInitializedRef.current = true;
    }
  }, [initialData]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!shouldScrollRef.current) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    
    if (isViewportAtBottom(viewport)) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [logs]);

  // Handle manual scroll to determine auto-scroll behavior
  const handleScroll = () => {
    const viewport = viewportRef.current;
    shouldScrollRef.current = isViewportAtBottom(viewport);
  };

  return (
    <Box>
      <Stack gap="sm">
        {isLoading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : error ? (
          <Text c="red" size="sm">
            {error}
          </Text>
        ) : (
          <ScrollArea h="75vh" viewportRef={viewportRef} onScrollPositionChange={handleScroll}>
            {logs ? (
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                <code>{logs}</code>
              </pre>
            ) : (
              <Text size="sm" c="dimmed">
                {t("common.state.empty")}
              </Text>
            )}
          </ScrollArea>
        )}
      </Stack>
    </Box>
  );
}).withOptions({
  size: "95%",
  centered: true,
  defaultTitle: (t) => t("docker.action.logs.label"),
});


