import { Box, Group, Input, NumberInput, SegmentedControl, Slider, Stack, Text } from "@mantine/core";

import { BOARD_FIXED_ITEM_SIZE_MAX, BOARD_FIXED_ITEM_SIZE_MIN } from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import {
  calculateBoardUiScale,
  calculateFixedBoardCanvasScale,
  normalizeFixedItemSize,
} from "~/components/board/layout/scaling";
import appearanceClasses from "~/components/board/layout/canvas-appearance.module.css";
import type { FormValues } from "./_settings-form";
import classes from "./_layout.module.css";

export const ScalingSettings = ({ form }: { form: UseFormReturnType<FormValues> }) => {
  const t = useI18n("board");
  const size = normalizeFixedItemSize(form.values.fixedItemSize);
  const canvasScale = calculateFixedBoardCanvasScale(size);
  const sampleUiScale = (canvasScale * calculateBoardUiScale(canvasScale)) / 2;

  return (
    <Box className={classes.scalingSettings}>
      <Stack gap="md" className={classes.scalingControls}>
        <Input.Wrapper label={t("setting.section.layout.scaling.title")}>
          <SegmentedControl
            fullWidth
            mt={6}
            aria-label={t("setting.section.layout.scaling.title")}
            value={form.values.fixedScaling ? "fixed" : "responsive"}
            onChange={(mode) => form.setFieldValue("fixedScaling", mode === "fixed")}
            data={[
              { value: "fixed", label: t("field.fixedScaling.label") },
              { value: "responsive", label: t("setting.section.layout.scaling.fit") },
            ]}
          />
        </Input.Wrapper>
        <Text size="sm" c="dimmed">
          {form.values.fixedScaling
            ? t("field.fixedScaling.description")
            : t("setting.section.layout.scaling.fitDescription")}
        </Text>
        <Group align="end" wrap="nowrap" gap="lg">
          <NumberInput
            label={t("field.fixedItemSize.label")}
            min={BOARD_FIXED_ITEM_SIZE_MIN}
            max={BOARD_FIXED_ITEM_SIZE_MAX}
            step={10}
            allowDecimal={false}
            disabled={!form.values.fixedScaling}
            suffix=" px"
            w={150}
            {...form.getInputProps("fixedItemSize")}
            onBlur={() => form.setFieldValue("fixedItemSize", normalizeFixedItemSize(form.getValues().fixedItemSize))}
          />
          <Box flex={1} pb={8}>
            <Slider
              thumbLabel={t("field.fixedItemSize.label")}
              min={BOARD_FIXED_ITEM_SIZE_MIN}
              max={BOARD_FIXED_ITEM_SIZE_MAX}
              step={10}
              disabled={!form.values.fixedScaling}
              value={size}
              onChange={(value) => form.setFieldValue("fixedItemSize", value)}
              label={(value) => `${value} px`}
            />
          </Box>
        </Group>
        <Text size="xs" c="dimmed">
          {t("setting.section.layout.scaling.sizeDescription")}
        </Text>
      </Stack>
      <Box
        component="figure"
        className={classes.fixedItemSizePreview}
        aria-label={t("field.fixedItemSize.previewLabel", { size })}
      >
        <Box
          className={`${classes.fixedItemSizePreviewTile} ${appearanceClasses.appearance}`}
          style={{
            width: size / 2,
            height: size / 2,
            borderRadius: `var(--mantine-radius-${form.values.itemRadius})`,
            "--board-canvas-ui-scale": sampleUiScale,
          }}
          aria-hidden="true"
        >
          <Text size="sm" fw={600}>
            1 × 1
          </Text>
        </Box>
        <Box component="figcaption" ta="center">
          <Text size="sm" fw={600} ff="monospace">
            {t("field.fixedItemSize.previewValue", { size })}
          </Text>
          <Text size="xs" c="dimmed">
            {t("setting.section.layout.scaling.halfSize")}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
