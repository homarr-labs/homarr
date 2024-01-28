import { capitalize } from "@homarr/common";
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
  const board = await api.board.byName.query(params.name);

  return (
    <Container>
      <Stack>
        <Title>Settings for {capitalize(board.name)} Board</Title>
        <Accordion variant="separated" defaultValue="general">
          <AccordionItem value="general">
            <AccordionControl icon={<IconSettings />}>
              <Text fw="bold" size="lg">
                General
              </Text>
            </AccordionControl>
            <AccordionPanel>
              <GeneralSettingsContent board={board} />
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="layout">
            <AccordionControl icon={<IconLayout />}>
              <Text fw="bold" size="lg">
                Layout
              </Text>
            </AccordionControl>
            <AccordionPanel>Layout</AccordionPanel>
          </AccordionItem>
          <AccordionItem value="appearance">
            <AccordionControl icon={<IconBrush />}>
              <Text fw="bold" size="lg">
                Appearance
              </Text>
            </AccordionControl>
            <AccordionPanel>Appearance</AccordionPanel>
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
                Danger zone
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
                      Rename board
                    </Text>
                    <Text size="sm">
                      Changing the name will break any links to this board.
                    </Text>
                  </Stack>
                  <Button variant="subtle" color="red">
                    Change name
                  </Button>
                </Group>
                <Divider />
                <Group justify="space-between" px="md">
                  <Stack gap={0}>
                    <Text fw="bold" size="sm">
                      Change board visibility
                    </Text>
                    <Text size="sm">This board is currently private.</Text>
                  </Stack>
                  <Button variant="subtle" color="red">
                    Make public
                  </Button>
                </Group>
                <Divider />
                <Group justify="space-between" px="md">
                  <Stack gap={0}>
                    <Text fw="bold" size="sm">
                      Delete this board
                    </Text>
                    <Text size="sm">
                      Once you delete a board, there is no going back. Please be
                      certain.
                    </Text>
                  </Stack>
                  <Button variant="subtle" color="red">
                    Delete this board
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
