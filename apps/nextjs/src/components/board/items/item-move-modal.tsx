import { useCallback, useRef } from "react";
import { Button, Grid, Group, NumberInput, Stack } from "@mantine/core";

import { useZodForm } from "@homarr/form";
import type { GridStack } from "@homarr/gridstack";
import { createModal } from "@homarr/modals";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { z } from "@homarr/validation";

import type { Item } from "~/app/[locale]/boards/_types";
import { useItemActions } from "./item-actions";

interface InnerProps {
  gridStack: GridStack;
  item: Pick<Item, "id" | "xOffset" | "yOffset" | "width" | "height">;
  columnCount: number;
}

export const ItemMoveModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const tCommon = useScopedI18n("common");
  const t = useI18n();
  // Keep track of the maximum width based on the x offset
  const maxWidthRef = useRef(innerProps.columnCount - innerProps.item.xOffset);
  const { moveAndResizeItem } = useItemActions();
  const form = useZodForm(
    z.object({
      xOffset: z
        .number()
        .min(0)
        .max(innerProps.columnCount - 1),
      yOffset: z.number().min(0),
      width: z.number().min(1).max(maxWidthRef.current),
      height: z.number().min(1),
    }),
    {
      initialValues: {
        xOffset: innerProps.item.xOffset,
        yOffset: innerProps.item.yOffset,
        width: innerProps.item.width,
        height: innerProps.item.height,
      },
      onValuesChange(values, previous) {
        // Update the maximum width when the x offset changes
        if (values.xOffset !== previous.xOffset) {
          maxWidthRef.current = innerProps.columnCount - values.xOffset;
        }
      },
    },
  );

  const handleSubmit = useCallback(
    (values: Omit<InnerProps["item"], "id">) => {
      const gridItem = innerProps.gridStack
        .getGridItems()
        .find((item) => item.getAttribute("data-id") === innerProps.item.id);
      if (!gridItem) return;
      innerProps.gridStack.update(gridItem, {
        h: values.height,
        w: values.width,
        x: values.xOffset,
        y: values.yOffset,
      });
      actions.closeModal();
    },
    [moveAndResizeItem],
  );

  return (
    <form onSubmit={form.onSubmit(handleSubmit, console.error)}>
      <Stack>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput
              label={t("item.moveResize.field.xOffset.label")}
              min={0}
              max={innerProps.columnCount - 1}
              {...form.getInputProps("xOffset")}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput label={t("item.moveResize.field.yOffset.label")} min={0} {...form.getInputProps("yOffset")} />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput
              label={t("item.moveResize.field.width.label")}
              min={1}
              max={innerProps.columnCount - form.values.xOffset}
              {...form.getInputProps("width")}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput label={t("item.moveResize.field.height.label")} min={1} {...form.getInputProps("height")} />
          </Grid.Col>
        </Grid>
        <Group justify="end">
          <Button variant="subtle" onClick={actions.closeModal}>
            {tCommon("action.cancel")}
          </Button>
          <Button type="submit">{tCommon("action.saveChanges")}</Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("item.moveResize.title");
  },
  size: "lg",
});
