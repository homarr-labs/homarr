"use client";

import { Anchor, Button, Card, Container, Flex, Group, ScrollArea, Text } from "@mantine/core";
import { IconCircleCheck, IconCircleX, IconReportSearch, IconTestPipe } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

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
  const board = useRequiredBoard();

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

  return (
    <Flex className="indexer-manager-container" h="100%" direction="column" gap="sm" p="sm" align="center">
      <Flex className="indexer-manager-title" align={"center"} gap={"xs"}>
        <IconReportSearch className="indexer-manager-title-icon" size={30} />
        <Text size="md" fw={"bold"}>
          {t("widget.indexerManager.title")}
        </Text>
      </Flex>
      <Card
        className={combineClasses("indexer-manager-list-container", classes.card)}
        w="100%"
        p="sm"
        radius={board.itemRadius}
        flex={1}
      >
        <ScrollArea className="indexer-manager-list-scroll-area" h="100%">
          {indexersData.map(({ integrationId, indexers }) => (
            <Container className={`indexer-manager-${integrationId}-list-container`} p={0} key={integrationId}>
              {indexers.map((indexer) => (
                <Group
                  className={`indexer-manager-line indexer-manager-${indexer.name}`}
                  h={30}
                  key={indexer.id}
                  justify="space-between"
                >
                  <Anchor
                    className="indexer-manager-line-anchor"
                    href={indexer.url}
                    target={options.openIndexerSiteInNewTab ? "_blank" : "_self"}
                  >
                    <Text className="indexer-manager-line-anchor-text" c="dimmed" size="md">
                      {indexer.name}
                    </Text>
                  </Anchor>
                  {indexer.status === false || indexer.enabled === false ? (
                    <IconCircleX
                      className="indexer-manager-line-status-icon indexer-manager-line-icon-disabled"
                      color="#d9534f"
                      size={24}
                    />
                  ) : (
                    <IconCircleCheck
                      className="indexer-manager-line-status-icon indexer-manager-line-icon-enabled"
                      color="#2ecc71"
                      size={24}
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
        radius={board.itemRadius}
        variant="light"
        leftSection={<IconTestPipe size={"1rem"} />}
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
