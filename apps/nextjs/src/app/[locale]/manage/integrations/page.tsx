import Link from "next/link";
import {
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  ActionIcon,
  ActionIconGroup,
  Anchor,
  Button,
  Container,
  Group,
  Menu,
  MenuDropdown,
  MenuTarget,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from "@mantine/core";
import { IconChevronDown, IconPencil } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { objectEntries } from "@homarr/common";
import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationName } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";
import { CountBadge } from "@homarr/ui";

import { ActiveTabAccordion } from "../../../../components/active-tab-accordion";
import { IntegrationAvatar } from "./_integration-avatar";
import { DeleteIntegrationActionButton } from "./_integration-buttons";
import { IntegrationCreateDropdownContent } from "./new/_integration-new-dropdown";

interface IntegrationsPageProps {
  searchParams: {
    tab?: IntegrationKind;
  };
}

export default async function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
  const integrations = await api.integration.all();
  const t = await getScopedI18n("integration");

  return (
    <Container>
      <Stack>
        <Group justify="space-between" align="center">
          <Title>{t("page.list.title")}</Title>
          <Menu width={256} trapFocus position="bottom-start" withinPortal shadow="md" keepMounted={false}>
            <MenuTarget>
              <Button rightSection={<IconChevronDown size={16} stroke={1.5} />}>{t("action.create")}</Button>
            </MenuTarget>
            <MenuDropdown>
              <IntegrationCreateDropdownContent />
            </MenuDropdown>
          </Menu>
        </Group>

        <IntegrationList integrations={integrations} activeTab={searchParams.tab} />
      </Stack>
    </Container>
  );
}

interface IntegrationListProps {
  integrations: RouterOutputs["integration"]["all"];
  activeTab?: IntegrationKind;
}

const IntegrationList = async ({ integrations, activeTab }: IntegrationListProps) => {
  const t = await getScopedI18n("integration");

  if (integrations.length === 0) {
    return <div>{t("page.list.empty")}</div>;
  }

  const grouppedIntegrations = integrations.reduce(
    (acc, integration) => {
      if (!acc[integration.kind]) {
        acc[integration.kind] = [];
      }

      acc[integration.kind].push(integration);

      return acc;
    },
    {} as Record<IntegrationKind, RouterOutputs["integration"]["all"]>,
  );

  return (
    <ActiveTabAccordion defaultValue={activeTab} variant="separated">
      {objectEntries(grouppedIntegrations).map(([kind, integrations]) => (
        <AccordionItem key={kind} value={kind}>
          <AccordionControl icon={<IntegrationAvatar size="sm" kind={kind} />}>
            <Group>
              <Text>{getIntegrationName(kind)}</Text>
              <CountBadge count={integrations.length} />
            </Group>
          </AccordionControl>
          <AccordionPanel>
            <Table>
              <TableThead>
                <TableTr>
                  <TableTh>{t("field.name.label")}</TableTh>
                  <TableTh>{t("field.url.label")}</TableTh>
                  <TableTh />
                </TableTr>
              </TableThead>
              <TableTbody>
                {integrations.map((integration) => (
                  <TableTr key={integration.id}>
                    <TableTd>{integration.name}</TableTd>
                    <TableTd>
                      <Anchor href={integration.url} target="_blank" rel="noreferrer" size="sm">
                        {integration.url}
                      </Anchor>
                    </TableTd>
                    <TableTd>
                      <Group justify="end">
                        <ActionIconGroup>
                          <ActionIcon
                            component={Link}
                            href={`/manage/integrations/edit/${integration.id}`}
                            variant="subtle"
                            color="gray"
                            aria-label="Edit integration"
                          >
                            <IconPencil size={16} stroke={1.5} />
                          </ActionIcon>
                          <DeleteIntegrationActionButton integration={integration} count={integrations.length} />
                        </ActionIconGroup>
                      </Group>
                    </TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </ActiveTabAccordion>
  );
};
