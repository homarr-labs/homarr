"use client";

import { Anchor, Button, Card, Container, Flex, Group, ScrollArea, Text } from "@mantine/core";
import { IconCircleCheck, IconCircleX, IconReportSearch, IconTestPipe } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function IndexerManagerWidget({ options, integrationIds }: WidgetComponentProps<"indexerManager">) {
  const t = useI18n();
  const [indexersData] = clientApi.widget.indexerManager.getIndexersStatus.useSuspenseQuery(
    { integrationIds },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const utils = clientApi.useUtils();

  const { mutate: testAll, isPending } = clientApi.widget.indexerManager.testAllIndexers.useMutation();

  clientApi.widget.indexerManager.subscribeIndexersStatus.useSubscription(
    { integrationIds },
    {
      onData(newData) {
        utils.widget.indexerManager.getIndexersStatus.setData({ integrationIds }, (previousData) =>
          previousData?.map((item) =>
            item.integrationId === newData.integrationId ? { ...item, indexers: newData.indexers } : item,
          ),
        );
      },
    },
  );

  const iconStyle = { height: "7.5cqmin", width: "7.5cqmin" };

  return (
    <Flex className="indexer-manager-container" h="100%" direction="column" gap="2.5cqmin" p="2.5cqmin" align="center">
      <Text className="indexer-manager-title" size="6.5cqmin">
        <IconReportSearch className="indexer-manager-title-icon" size="7cqmin" /> {t("widget.indexerManager.title")}
      </Text>
      <Card className="indexer-manager-list-container" w="100%" p="2.5cqmin" radius="md" flex={1} withBorder>
        <ScrollArea className="indexer-manager-list-scroll-area" h="100%">
          {indexersData.map(({ integrationId, indexers }) => (
            <Container className={`indexer-manager-${integrationId}-list-container`} p={0} key={integrationId}>
              {indexers.map((indexer) => (
                <Group
                  className={`indexer-manager-line indexer-manager-${indexer.name}`}
                  h="7.5cqmin"
                  key={indexer.id}
                  justify="space-between"
                >
                  <Anchor
                    className="indexer-manager-line-anchor"
                    href={indexer.url}
                    target={options.openIndexerSiteInNewTab ? "_blank" : "_self"}
                  >
                    <Text className="indexer-manager-line-anchor-text" c="dimmed" size="5cqmin">
                      {indexer.name}
                    </Text>
                  </Anchor>
                  {indexer.status === false || indexer.enabled === false ? (
                    <IconCircleX
                      className="indexer-manager-line-status-icon indexer-manager-line-icon-disabled"
                      color="#d9534f"
                      style={iconStyle}
                    />
                  ) : (
                    <IconCircleCheck
                      className="indexer-manager-line-status-icon indexer-manager-line-icon-enabled"
                      color="#2ecc71"
                      style={iconStyle}
                    />
                  )}
                </Group>
              ))}
            </Container>
          ))}
        </ScrollArea>
      </Card>
      <Button
        className="indexer-manager-test-button"
        w="100%"
        fz="5cqmin"
        h="12.5cqmin"
        radius="md"
        variant="light"
        leftSection={<IconTestPipe style={iconStyle} />}
        loading={isPending}
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
