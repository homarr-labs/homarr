"use client";

import type { ReactNode } from "react";
import { Button, Group, InputWrapper, Popover, Slider, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

interface PreviewDimensionsPopoverProps {
  target: (onClick: () => void) => ReactNode;
  dimensions: Dimensions;
  setDimensions: (dimensions: Dimensions) => void;
}

export const PreviewDimensionsPopover = ({ target, dimensions, setDimensions }: PreviewDimensionsPopoverProps) => {
  const t = useI18n();
  const [opened, { close, open }] = useDisclosure(false);
  const form = useForm({
    initialValues: dimensions,
  });

  const handleSubmit = (values: Dimensions) => {
    setDimensions(values);
    close();
  };

  const handleClose = () => {
    form.setValues(dimensions);
    close();
  };

  const handleToggle = () => {
    if (opened) {
      handleClose();
      return;
    }
    open();
  };

  return (
    <Popover
      opened={opened}
      onChange={(nextOpened) => {
        if (nextOpened) open();
        if (!nextOpened) handleClose();
      }}
      position="top-end"
      width="min(320px, calc(100vw - 2rem))"
      withArrow
    >
      <Popover.Target>{target(handleToggle)}</Popover.Target>
      <Popover.Dropdown>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <InputWrapper label={t("item.moveResize.field.width.label")}>
              <Slider min={64} max={1024} step={64} {...form.getInputProps("width")} />
            </InputWrapper>
            <InputWrapper label={t("item.moveResize.field.height.label")}>
              <Slider min={64} max={1024} step={64} {...form.getInputProps("height")} />
            </InputWrapper>
            <Group justify="end">
              <Button variant="subtle" color="gray" onClick={handleClose}>
                {t("common.action.cancel")}
              </Button>
              <Button type="submit">{t("common.action.confirm")}</Button>
            </Group>
          </Stack>
        </form>
      </Popover.Dropdown>
    </Popover>
  );
};

export interface Dimensions {
  width: number;
  height: number;
}
