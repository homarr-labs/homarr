import { useMemo } from "react";
import { Anchor, Button, Card, Flex, Group, ScrollArea, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCircleCheck, IconCircleX, IconReportSearch, IconTestPipe } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationSelectedError } from "../errors";

export default function IndexerManagerWidget({
  options,
  integrationIds,
  serverData,
}: WidgetComponentProps<"indexerManager">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }
  const t = useI18n();
  const data = useMemo(() => (serverData?.initialData ?? []).flatMap((indexers) => indexers.indexers), [serverData]);

  const [loading, { toggle }] = useDisclosure();
  const { mutate: testAll } = clientApi.widget.indexerManager.testAllIndexers.useMutation({
    onMutate: () => {
      toggle();
    },
    onSettled: () => {
      toggle();
    },
  });

  return (
    <Flex h="100%" direction="column">
      <Text size="6.5cqmin" mt="1.5cqmin" pl="20cqmin">
        <IconReportSearch size="7cqmin" /> {t("widget.indexerManager.title")}
      </Text>
      <Card m="2.5cqmin" p="2.5cqmin" radius="md" withBorder>
        <ScrollArea h="100%">
          {data.map((indexer) => (
            <Group key={indexer.id} justify="space-between">
              <Anchor href={indexer.url} target={options.openIndexerSiteInNewTab ? "_blank" : "_self"}>
                <Text c="dimmed" size="xs">
                  {indexer.name}
                </Text>
              </Anchor>
              {indexer.status === false || indexer.enabled === false ? (
                <IconCircleX color="#d9534f" />
              ) : (
                <IconCircleCheck color="#2ecc71" />
              )}
            </Group>
          ))}
        </ScrollArea>
      </Card>
      <Button
        m="2.5cqmin"
        p="2.5cqmin"
        radius="md"
        variant="light"
        leftSection={<IconTestPipe size={20} />}
        loading={loading}
        loaderProps={{ type: "dots" }}
        onClick={() => {
          testAll({ integrationIds });
        }}
      >
        {t("widget.indexerManager.testAll")}
      </Button>
    </Flex>
  );
}
