"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Code,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconCircleCheck, IconPlugConnected, IconPlugConnectedX } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";
import { CatalogItem } from "@homarr/ui";

import { catalogInteractionFixtures, catalogStateFixtures, responseStateFixtures } from "./_feature-state-fixtures";
import type { CatalogFixtureId, CatalogInteractionId, ResponseFixtureId } from "./_feature-state-fixtures";
import type { ResponseContractFixtureResult } from "./_response-contract-fixtures";

interface FeatureStateWorkbenchProps {
  responseResults: readonly ResponseContractFixtureResult[];
}

export function FeatureStateWorkbench({ responseResults }: FeatureStateWorkbenchProps) {
  const t = useScopedI18n("featureWorkbench");
  const [catalogFixtureId, setCatalogFixtureId] = useState<CatalogFixtureId>("ready");
  const [interactionId, setInteractionId] = useState<CatalogInteractionId>("default");
  const [responseFixtureId, setResponseFixtureId] = useState<ResponseFixtureId>("loading");
  const catalogFixture = catalogStateFixtures.find((fixture) => fixture.id === catalogFixtureId);
  const responseFixture = responseStateFixtures.find((fixture) => fixture.id === responseFixtureId);
  if (!catalogFixture || !responseFixture) return null;
  const responseResult = responseResults.find((result) => result.name === responseFixtureId);
  const busy = interactionId === "loading";
  const disabled = interactionId === "disabled";
  const selected = interactionId === "selected";
  const catalogLabel = t(`catalog.state.${catalogFixture.id}.label`);
  const catalogStatus = busy ? t("catalog.loading") : t(`catalog.state.${catalogFixture.id}.status`);

  return (
    <Stack gap="xl" maw={960}>
      <Paper component="section" withBorder p="lg" aria-labelledby="catalog-workbench-title">
        <Stack gap="lg">
          <div>
            <Title id="catalog-workbench-title" order={2} size="h3">
              {t("catalog.title")}
            </Title>
            <Text c="dimmed" size="sm" maw={680}>
              {t("catalog.description")}
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Stack gap="xs">
              <Text size="sm" fw={600} id="catalog-fixture-label">
                {t("catalog.serviceState")}
              </Text>
              <SegmentedControl
                aria-labelledby="catalog-fixture-label"
                value={catalogFixtureId}
                onChange={(value) => setCatalogFixtureId(value as CatalogFixtureId)}
                data={catalogStateFixtures.map((fixture) => ({
                  value: fixture.id,
                  label: t(`catalog.state.${fixture.id}.status`),
                }))}
              />
            </Stack>
            <Stack gap="xs">
              <Text size="sm" fw={600} id="catalog-interaction-label">
                {t("catalog.interactionState")}
              </Text>
              <SegmentedControl
                aria-labelledby="catalog-interaction-label"
                value={interactionId}
                onChange={(value) => setInteractionId(value as CatalogInteractionId)}
                data={catalogInteractionFixtures.map((id) => ({
                  value: id,
                  label: t(`catalog.interaction.${id}`),
                }))}
              />
            </Stack>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <CatalogItem
              height={140}
              label={catalogLabel}
              status={catalogStatus}
              selected={selected}
              busy={busy}
              disabled={disabled}
              onSelect={() => setInteractionId(selected ? "default" : "selected")}
            >
              {busy ? (
                <Stack gap="sm" aria-label={t("catalog.loadingAriaLabel")}>
                  <Skeleton height={24} width="65%" />
                  <Skeleton height={16} />
                  <Skeleton height={20} width="40%" />
                </Stack>
              ) : (
                <Stack justify="space-between" h="100%" gap="sm">
                  <Group wrap="nowrap" align="flex-start">
                    <ThemeIcon variant="light" color={catalogFixture.color} aria-hidden>
                      {catalogFixture.id === "noConnection" ? (
                        <IconPlugConnectedX size={18} />
                      ) : (
                        <IconPlugConnected size={18} />
                      )}
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text fw={600} size="sm">
                        {catalogLabel}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {t(`catalog.state.${catalogFixture.id}.description`)}
                      </Text>
                    </Stack>
                  </Group>
                  <Badge color={catalogFixture.color} variant="light" size="sm" w="fit-content">
                    {t(`catalog.state.${catalogFixture.id}.status`)}
                  </Badge>
                </Stack>
              )}
            </CatalogItem>

            <Stack gap="xs" justify="center">
              <Text size="sm" fw={600}>
                {t("catalog.semanticOutput")}
              </Text>
              <Code
                block
              >{`aria-label="${catalogLabel}, ${catalogStatus}"\naria-pressed=${selected}\ndisabled=${busy || disabled}\naria-busy=${busy}`}</Code>
              <Text size="xs" c="dimmed">
                {t("catalog.instructions")}
              </Text>
            </Stack>
          </SimpleGrid>
        </Stack>
      </Paper>

      <Paper component="section" withBorder p="lg" aria-labelledby="response-workbench-title">
        <Stack gap="lg">
          <div>
            <Title id="response-workbench-title" order={2} size="h3">
              {t("response.title")}
            </Title>
            <Text c="dimmed" size="sm" maw={680}>
              {t("response.description")}
            </Text>
          </div>

          <SegmentedControl
            aria-label={t("response.fixtureLabel")}
            value={responseFixtureId}
            onChange={(value) => setResponseFixtureId(value as ResponseFixtureId)}
            data={responseStateFixtures.map((fixture) => ({
              value: fixture.id,
              label: t(`response.state.${fixture.id}.label`),
            }))}
          />

          {responseFixture.id === "loading" ? (
            <Stack component="output" gap="sm" aria-label={t("response.checking")}>
              <Group justify="space-between">
                <Skeleton height={22} width={180} />
                <Skeleton height={22} width={72} />
              </Group>
              <Skeleton height={72} />
            </Stack>
          ) : (
            <Alert
              color={responseFixture.id === "success" ? "green" : "red"}
              icon={responseFixture.id === "success" ? <IconCircleCheck /> : <IconAlertCircle />}
              title={t(`response.state.${responseFixture.id}.title`)}
              role={responseFixture.id === "failure" ? "alert" : "status"}
            >
              <Stack gap="sm">
                <Text size="sm">{t(`response.state.${responseFixture.id}.description`)}</Text>
                <Code block>{JSON.stringify(responseFixture.payload, null, 2)}</Code>
                <Badge color={responseResult?.passed ? "green" : "red"} variant="light" w="fit-content">
                  {responseResult?.passed ? t("response.contractPassed") : t("response.contractFailed")}
                </Badge>
              </Stack>
            </Alert>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
