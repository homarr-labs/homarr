"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JsxParser from "react-jsx-parser";
import {
  Alert,
  Button,
  Loader,
  Popover,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertTriangle, IconEye } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { WHITELISTED_COMPONENTS_INNER, SAFE_BINDINGS } from "./jsx-whitelist";

interface SubFetchProps {
  url: string;
  template: string;
  trigger?: "inline" | "popover";
  buttonLabel?: string;
  buttonVariant?: string;
  width?: number;
  definitionId: string;
}

function SubFetchContent({ data, template }: { data: unknown; template: string }) {
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const handleError = useCallback((error: Error) => {
    setParseErrors((prev) => {
      if (prev.length >= 3) return prev;
      const msg = error.message;
      if (prev.includes(msg)) return prev;
      return [...prev, msg];
    });
  }, []);

  return (
    <Stack gap={0}>
      <JsxParser
        jsx={template}
        components={WHITELISTED_COMPONENTS_INNER as never}
        bindings={SAFE_BINDINGS(data)}
        componentsOnly
        allowUnknownElements={false}
        blacklistedAttrs={[/^on.+/i, /^dangerously/i]}
        blacklistedTags={["script", "iframe", "object", "embed", "form", "style", "link", "meta", "base"]}
        onError={handleError}
        renderError={({ error }) => (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={14} />} p="xs">
            <Text size="xs">{String(error)}</Text>
          </Alert>
        )}
      />
      {parseErrors.length > 0 && (
        <Alert color="yellow" variant="light" p="xs" mt="xs">
          <Text size="xs" c="dimmed">{parseErrors.length} sub-template warning(s)</Text>
        </Alert>
      )}
    </Stack>
  );
}

export function SubFetch({
  url,
  template,
  trigger = "popover",
  buttonLabel = "View",
  buttonVariant = "light",
  width = 380,
  definitionId,
}: SubFetchProps) {
  const [opened, setOpened] = useState(false);
  const prevUrlRef = useRef(url);

  const { mutate, isPending, data, error, reset } = clientApi.customWidget.subFetch.useMutation();

  useEffect(() => {
    if (prevUrlRef.current !== url) {
      prevUrlRef.current = url;
      reset();
    }
  }, [url, reset]);

  useEffect(() => {
    if (trigger === "inline" && !data && !isPending && !error) {
      mutate({ url, definitionId });
    }
  }, [trigger, url, definitionId, mutate, data, isPending, error]);

  const handleOpen = useCallback(() => {
    setOpened(true);
    if (!data && !isPending && !error) {
      mutate({ url, definitionId });
    }
  }, [url, definitionId, mutate, data, isPending, error]);

  const content = (() => {
    if (isPending) return <Stack align="center" p="md"><Loader size="sm" /></Stack>;
    if (error) return (
      <Alert color="red" variant="light" icon={<IconAlertTriangle size={14} />} p="xs">
        <Text size="xs">{error.message}</Text>
      </Alert>
    );
    if (data) return <SubFetchContent data={data} template={template} />;
    return null;
  })();

  if (trigger === "inline") {
    return content;
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={width}
      position="bottom"
      shadow="md"
      withinPortal
      trapFocus
    >
      <Popover.Target>
        <Button
          variant={buttonVariant}
          size="compact-xs"
          leftSection={<IconEye size={12} />}
          onClick={handleOpen}
        >
          {buttonLabel}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <ScrollArea.Autosize mah={400}>
          {content}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
