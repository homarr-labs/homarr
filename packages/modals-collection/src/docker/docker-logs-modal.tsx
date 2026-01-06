"use client";

import { useEffect, useRef } from "react";
import { Box, Group, Loader, ScrollArea, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

interface DockerLogsModalInnerProps {
  id: string;
  name: string;
  tail?: number;
}

export const DockerLogsModal = createModal<DockerLogsModalInnerProps>(({ innerProps }) => {
  const t = useI18n();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);

  const { data, isPending, isError } = clientApi.docker.logs.useQuery(
    { id: innerProps.id, tail: innerProps.tail },
    {
      refetchOnWindowFocus: false,
      retry: 0,
      refetchInterval: 1000,
      refetchIntervalInBackground: true,
    },
  );

  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (!data?.logs) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
    didInitialScrollRef.current = true;
  }, [data?.logs]);

  return (
    <Box>
      <Stack gap="sm">
        {isPending ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : isError ? (
          <Text c="red" size="sm">
            Failed to load logs
          </Text>
        ) : (
          <ScrollArea h="75vh" viewportRef={viewportRef}>
            {data?.logs ? (
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                <code>{data.logs}</code>
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


