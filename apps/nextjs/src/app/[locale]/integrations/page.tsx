import Link from "next/link";

import type { RouterOutputs } from "@homarr/api";
import { capitalize, objectEntries } from "@homarr/common";
import type { IntegrationKind } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";
import {
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  ActionIcon,
  ActionIconGroup,
  Anchor,
  Button,
  Container,
  CountBadge,
  Group,
  IconChevronDown,
  IconPencil,
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
} from "@homarr/ui";

import { api } from "~/trpc/server";
import { IntegrationGroupAccordion } from "./_accordion";
import { IntegrationAvatar } from "./_avatar";
import { DeleteIntegrationActionButton } from "./_buttons";
import { IntegrationCreateDropdownContent } from "./new/_dropdown";

interface IntegrationsPageProps {
  searchParams: {
    activeTab?: IntegrationKind;
  };
}

export default async function IntegrationsPage({
  searchParams,
}: IntegrationsPageProps) {
  const integrations = await api.integration.all.query();
  const t = await getScopedI18n("integration");

  return (
    <Container>
      <Stack>
        <Group justify="space-between" align="center">
          <Title>{t("page.list.title")}</Title>
          <Menu
            width={256}
            trapFocus
            position="bottom-start"
            withinPortal
            shadow="md"
            keepMounted={false}
          >
            <MenuTarget>
              <Button rightSection={<IconChevronDown size={16} stroke={1.5} />}>
                {t("action.create")}
              </Button>
            </MenuTarget>
            <MenuDropdown>
              <IntegrationCreateDropdownContent />
            </MenuDropdown>
          </Menu>
        </Group>

        <IntegrationList
          integrations={integrations}
          activeTab={searchParams.activeTab}
        />
      </Stack>
    </Container>
  );
}

interface IntegrationListProps {
  integrations: RouterOutputs["integration"]["all"];
  activeTab?: IntegrationKind;
}

const IntegrationList = async ({
  integrations,
  activeTab,
}: IntegrationListProps) => {
  const t = await getScopedI18n("integration");

  if (integrations.length === 0) {
    return <div>No integrations</div>;
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
    <IntegrationGroupAccordion activeTab={activeTab}>
      {objectEntries(grouppedIntegrations).map(([kind, integrations]) => (
        <AccordionItem key={kind} value={kind}>
          <AccordionControl icon={<IntegrationAvatar size="sm" kind={kind} />}>
            <Group>
              <Text>{capitalize(kind)}</Text>
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
                      <Anchor
                        href={integration.url}
                        target="_blank"
                        rel="noreferrer"
                        size="sm"
                      >
                        {integration.url}
                      </Anchor>
                    </TableTd>
                    <TableTd>
                      <Group justify="end">
                        <ActionIconGroup>
                          <ActionIcon
                            component={Link}
                            href={`/integrations/edit/${integration.id}`}
                            variant="subtle"
                            color="gray"
                          >
                            <IconPencil size={16} stroke={1.5} />
                          </ActionIcon>
                          <DeleteIntegrationActionButton
                            integrationId={integration.id}
                            count={integrations.length}
                          />
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
    </IntegrationGroupAccordion>
  );
};
