import { Button, Card, Center, Grid, Stack, Text } from "@mantine/core";

import { objectEntries } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { widgetImports } from "@homarr/widgets";
import type { WidgetDefinition } from "@homarr/widgets";

import { useItemActions } from "./item-actions";

export const ItemSelectModal = createModal<void>(({ actions }) => {
  return (
    <Grid>
      {objectEntries(widgetImports).map(([key, value]) => {
        return <WidgetItem key={key} kind={key} definition={value.definition} closeModal={actions.closeModal} />;
      })}
    </Grid>
  );
}).withOptions({
  defaultTitle: (t) => t("item.create.title"),
  size: "xl",
});

const WidgetItem = ({
  kind,
  definition,
  closeModal,
}: {
  kind: WidgetKind;
  definition: WidgetDefinition;
  closeModal: () => void;
}) => {
  const t = useI18n();
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
              {t(`widget.${kind}.name`)}
            </Text>
            <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" ta="center" c="dimmed">
              {t(`widget.${kind}.description`)}
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
            {t(`item.create.addToBoard`)}
          </Button>
        </Stack>
      </Card>
    </Grid.Col>
  );
};
