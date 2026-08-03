import { Fragment } from "react";
import { redirect } from "next/navigation";
import {
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  ActionIcon,
  ActionIconGroup,
  Anchor,
  Divider,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { IconPencil, IconPlugX } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { objectEntries } from "@homarr/common";
import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationName } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";
import { CountBadge, IntegrationAvatar, Link } from "@homarr/ui";

import { TourTarget } from "~/components/layout/header/tour-target";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { NoResults } from "~/components/no-results";
import { ActiveTabAccordion } from "../../../../components/active-tab-accordion";
import { DeleteIntegrationActionButton } from "./_integration-buttons";
import classes from "./page.module.css";

interface IntegrationsPageProps {
  searchParams: Promise<{
    tab?: IntegrationKind;
  }>;
}

export default async function IntegrationsPage(props: IntegrationsPageProps) {
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session) {
    redirect("/auth/login");
  }

  const integrations = await api.integration.all();
  const t = await getScopedI18n("integration");

  const canCreateIntegrations = session.user.permissions.includes("integration-create");

  return (
    <ManagePageLayout
      title={t("page.list.title")}
      primaryAction={
        canCreateIntegrations ? (
          <TourTarget id="manage-integrations-create">
            <MobileAffixButton component={Link} href="/manage/integrations/new">
              {t("action.create")}
            </MobileAffixButton>
          </TourTarget>
        ) : undefined
      }
      floatingPrimaryAction={canCreateIntegrations}
    >
      <TourTarget id="manage-integrations-list">
        <IntegrationList integrations={integrations} activeTab={searchParams.tab} />
      </TourTarget>
    </ManagePageLayout>
  );
}

interface IntegrationListProps {
  integrations: RouterOutputs["integration"]["all"];
  activeTab?: IntegrationKind;
}

const IntegrationList = async ({ integrations, activeTab }: IntegrationListProps) => {
  const t = await getScopedI18n("integration");
  const session = await auth();
  const hasFullAccess = session?.user.permissions.includes("integration-full-all") ?? false;

  if (integrations.length === 0) {
    return <NoResults icon={IconPlugX} title={t("page.list.noResults.title")} />;
  }

  const groupedIntegrations = integrations.reduce(
    (acc, integration) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!acc[integration.kind]) {
        acc[integration.kind] = [];
      }

      acc[integration.kind].push(integration);

      return acc;
    },
    {} as Record<IntegrationKind, RouterOutputs["integration"]["all"]>,
  );

  const entries = objectEntries(groupedIntegrations);

  return (
    <ActiveTabAccordion defaultValue={activeTab} radius="lg" classNames={classes}>
      {entries.map(([kind, kindIntegrations], index) => (
        <AccordionItem key={kind} value={kind} data-first={index === 0} data-last={index === entries.length - 1}>
          <AccordionControl icon={<IntegrationAvatar size="sm" kind={kind} radius="sm" />}>
            <Group>
              <Text>{getIntegrationName(kind)}</Text>
              <CountBadge count={kindIntegrations.length} />
            </Group>
          </AccordionControl>
          <AccordionPanel>
            <Table visibleFrom="md">
              <TableThead>
                <TableTr>
                  <TableTh>{t("field.name.label")}</TableTh>
                  <TableTh>{t("field.url.label")}</TableTh>
                  <TableTh />
                </TableTr>
              </TableThead>
              <TableTbody>
                {kindIntegrations.map((integration) => (
                  <TableTr key={integration.id}>
                    <TableTd>{integration.name}</TableTd>
                    <TableTd>
                      <Anchor href={integration.url} target="_blank" rel="noreferrer" size="sm">
                        {integration.url}
                      </Anchor>
                    </TableTd>
                    <TableTd>
                      <Group justify="end">
                        {(hasFullAccess || integration.permissions.hasFullAccess) && (
                          <ActionIconGroup>
                            <ActionIcon
                              component={Link}
                              href={`/manage/integrations/edit/${integration.id}`}
                              variant="subtle"
                              color="gray"
                              aria-label={t("page.edit.title", { name: getIntegrationName(integration.kind) })}
                            >
                              <IconPencil size={16} stroke={1.5} />
                            </ActionIcon>
                            <DeleteIntegrationActionButton integration={integration} count={kindIntegrations.length} />
                          </ActionIconGroup>
                        )}
                      </Group>
                    </TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>

            <Stack gap="xs" hiddenFrom="md">
              {kindIntegrations.map((integration, integrationIndex) => (
                <Fragment key={integration.id}>
                  {integrationIndex !== 0 && <Divider />}
                  <Stack gap={0}>
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Text>{integration.name}</Text>
                      {(hasFullAccess || integration.permissions.hasFullAccess) && (
                        <ActionIconGroup>
                          <ActionIcon
                            component={Link}
                            href={`/manage/integrations/edit/${integration.id}`}
                            variant="subtle"
                            color="gray"
                            aria-label={t("page.edit.title", { name: getIntegrationName(integration.kind) })}
                          >
                            <IconPencil size={16} stroke={1.5} />
                          </ActionIcon>
                          <DeleteIntegrationActionButton integration={integration} count={kindIntegrations.length} />
                        </ActionIconGroup>
                      )}
                    </Group>
                    <Anchor href={integration.url} target="_blank" rel="noreferrer" size="sm">
                      {integration.url}
                    </Anchor>
                  </Stack>
                </Fragment>
              ))}
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </ActiveTabAccordion>
  );
};
