import type { ManagedModal } from "mantine-modal-manager";

import type { WidgetKind } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import { Button, Card, Center, Grid, Stack, Text } from "@homarr/ui";

import { objectEntries } from "../../../../../../packages/common/src";
import { widgetImports } from "../../../../../../packages/widgets/src";
import type { WidgetDefinition } from "../../../../../../packages/widgets/src/definition";
import { useItemActions } from "./item-actions";

export const ItemSelectModal: ManagedModal<Record<string, never>> = ({
  actions,
}) => {
  return (
    <Grid>
      {objectEntries(widgetImports).map(([key, value]) => {
        return (
          <WidgetItem
            key={key}
            kind={key}
            definition={value.definition}
            closeModal={actions.closeModal}
          />
        );
      })}
    </Grid>
  );
};

const WidgetItem = ({
  kind,
  definition,
  closeModal,
}: {
  kind: WidgetKind;
  definition: WidgetDefinition;
  closeModal: () => void;
}) => {
  const t = useScopedI18n("widget");
  const { createItem } = useItemActions();
  const handleAdd = (kind: WidgetKind) => {
    createItem({ kind });
    closeModal();
  };

  return (
    <Grid.Col span={{ xs: 12, sm: 4, md: 3 }}>
      <Card h="100%">
        <Stack justify="space-between" h="100%">
          <Stack gap="xs">
            <Center>
              <definition.icon />
            </Center>
            <Text lh={1.2} style={{ whiteSpace: "normal" }} ta="center">
              {t(`${kind}.name`)}
            </Text>
            <Text
              lh={1.2}
              style={{ whiteSpace: "normal" }}
              size="xs"
              ta="center"
              c="dimmed"
            >
              {t(`${kind}.description`)}
            </Text>
          </Stack>
          <Button
            onClick={() => {
              handleAdd(kind);
            }}
            variant="light"
            size="xs"
            mt="auto"
            radius="md"
            fullWidth
          >
            {t(`addToBoard`)}
          </Button>
        </Stack>
      </Card>
    </Grid.Col>
  );
};
