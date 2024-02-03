import { capitalize } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";
import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Button,
  Container,
  Divider,
  Group,
  IconAlertTriangle,
  IconBrush,
  IconLayout,
  IconSettings,
  Stack,
  Text,
  Title,
} from "@homarr/ui";

import { api } from "~/trpc/server";
import { GeneralSettingsContent } from "./_general";

interface Props {
  params: {
    name: string;
  };
}

export default async function BoardSettingsPage({ params }: Props) {
  const board = await api.board.byName.query({ name: params.name });
  const t = useScopedI18n("board.setting");

  return (
    <Container>
      <Stack>
        <Title>{t("title", { boardName: capitalize(board.name) })}</Title>
        <Accordion variant="separated" defaultValue="general">
          <AccordionItem value="general">
            <AccordionControl icon={<IconSettings />}>
              <Text fw="bold" size="lg">
                {t("section.general.title")}
              </Text>
            </AccordionControl>
            <AccordionPanel>
              <GeneralSettingsContent board={board} />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="layout">
            <AccordionControl icon={<IconLayout />}>
              <Text fw="bold" size="lg">
                {t("section.layout.title")}
              </Text>
            </AccordionControl>
            <AccordionPanel></AccordionPanel>
          </AccordionItem>
          <AccordionItem value="appearance">
            <AccordionControl icon={<IconBrush />}>
              <Text fw="bold" size="lg">
                {t("section.appearance.title")}
              </Text>
            </AccordionControl>
            <AccordionPanel></AccordionPanel>
          </AccordionItem>
          <AccordionItem
            value="danger"
            styles={{
              item: {
                "--__item-border-color": "rgba(248,81,73,0.4)",
              },
            }}
          >
            <AccordionControl icon={<IconAlertTriangle />}>
              <Text fw="bold" size="lg">
                {t("section.dangerZone.title")}
              </Text>
            </AccordionControl>
            <AccordionPanel
              styles={{ content: { paddingRight: 0, paddingLeft: 0 } }}
            >
              <Stack gap="sm">
                <Divider />
                <Group justify="space-between" px="md">
                  <Stack gap={0}>
                    <Text fw="bold" size="sm">
                      {t("section.dangerZone.action.rename.label")}
                    </Text>
                    <Text size="sm">
                      {t("section.dangerZone.action.rename.description")}
                    </Text>
                  </Stack>
                  <Button variant="subtle" color="red">
                    {t("section.dangerZone.action.rename.button")}
                  </Button>
                </Group>
                <Divider />
                <Group justify="space-between" px="md">
                  <Stack gap={0}>
                    <Text fw="bold" size="sm">
                      {t("section.dangerZone.action.visibility.label")}
                    </Text>
                    <Text size="sm">
                      {t(
                        "section.dangerZone.action.visibility.description.private",
                      )}
                    </Text>
                  </Stack>
                  <Button variant="subtle" color="red">
                    {t("section.dangerZone.action.visibility.button.private")}
                  </Button>
                </Group>
                <Divider />
                <Group justify="space-between" px="md">
                  <Stack gap={0}>
                    <Text fw="bold" size="sm">
                      {t("section.dangerZone.action.delete.label")}
                    </Text>
                    <Text size="sm">
                      {t("section.dangerZone.action.delete.description")}
                    </Text>
                  </Stack>
                  <Button variant="subtle" color="red">
                    {t("section.dangerZone.action.delete.button")}
                  </Button>
                </Group>
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Stack>
    </Container>
  );
}
