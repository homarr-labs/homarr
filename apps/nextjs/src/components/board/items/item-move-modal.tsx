import { useCallback, useRef } from "react";
import { Grid, NumberInput, Stack } from "@mantine/core";
import { z } from "zod/v4";

import { useZodForm } from "@homarr/form";
import type { GridStack } from "@homarr/gridstack";
import { createModal, ModalFormFooter, modalSizeForm } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import type { Item, SectionItem } from "~/app/[locale]/boards/_types";

interface InnerProps {
  gridStack: GridStack;
  item: Pick<SectionItem, "id" | "width" | "height" | "xOffset" | "yOffset">;
  columnCount: number;
}

export const ItemMoveModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const maxWidthRef = useRef(innerProps.columnCount - innerProps.item.xOffset);
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
        if (values.xOffset !== previous.xOffset) {
          maxWidthRef.current = innerProps.columnCount - values.xOffset;
        }
      },
    },
  );

  const handleSubmit = useCallback(
    (values: Pick<Item["layouts"][number], "height" | "width" | "xOffset" | "yOffset">) => {
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
    [actions, innerProps.gridStack, innerProps.item.id],
  );

  return (
    <form onSubmit={form.onSubmit(handleSubmit, console.error)}>
      <Stack>
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput
              label={t("item.moveResize.field.xOffset.label")}
              data-autofocus
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
        <ModalFormFooter onCancel={actions.closeModal} />
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("item.moveResize.title");
  },
  size: modalSizeForm,
});
