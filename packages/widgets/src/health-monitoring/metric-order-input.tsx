"use client";

import { cloneElement, isValidElement, useRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { ActionIcon, Button, Group, Select, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { useFormContext } from "../_inputs/form";
import type { SortableItemListInput } from "../options";
import { getHealthMetricOrder, healthMetricLabels, healthMetrics, isHealthMetric } from "./configuration";
import type { HealthMetric } from "./configuration";

type MetricInput = SortableItemListInput<HealthMetric, HealthMetric>;

export const MetricOrderItem: MetricInput["ItemComponent"] = ({ item, handle, removeItem, rootAttributes }) => {
  const t = useI18n("widget.healthMonitoring");
  const name = t(`rework.${healthMetricLabels[item]}`);
  const form = useFormContext();
  const positionInput = useRef<HTMLInputElement>(null);
  const metrics = getHealthMetricOrder(form.values.options);
  const index = metrics.indexOf(item);

  function moveTo(position: string | null) {
    const destination = Number(position) - 1;
    if (index < 0 || destination < 0 || destination >= metrics.length || index === destination) return;
    const reordered = [...metrics];
    reordered.splice(index, 1);
    reordered.splice(destination, 0, item);
    const editor = positionInput.current?.form;
    form.setFieldValue("options.metricOrder", reordered);
    requestAnimationFrame(() => {
      editor?.querySelector<HTMLInputElement>(`[data-metric-position="${item}"]`)?.focus();
    });
  }

  let dragHandle = handle;
  if (
    isValidElement<ButtonHTMLAttributes<HTMLButtonElement> & { "data-health-metric-handle"?: HealthMetric }>(handle)
  ) {
    dragHandle = cloneElement(handle, {
      ...rootAttributes,
      "data-health-metric-handle": item,
      "aria-label": t("option.metricOrder.reorder", { name }),
    });
  }
  return (
    <Group gap="xs" wrap="nowrap">
      {dragHandle}
      <Text flex={1} size="sm">
        {name}
      </Text>
      {metrics.length > 1 && (
        <Select
          ref={positionInput}
          data-metric-position={item}
          data={metrics.map((_, order) => String(order + 1))}
          value={String(index + 1)}
          onChange={moveTo}
          allowDeselect={false}
          aria-label={t("option.metricOrder.position", { name })}
          w={64}
          size="xs"
        />
      )}
      <ActionIcon
        variant="subtle"
        color="red"
        onClick={(event) => {
          const editor = event.currentTarget.form;
          const next = metrics[index + 1] ?? metrics[index - 1];
          removeItem();
          requestAnimationFrame(() => {
            let selector = "[data-health-metric-customize], [data-health-metric-picker]";
            if (next) selector = `[data-health-metric-handle="${next}"]`;
            editor?.querySelector<HTMLElement>(selector)?.focus();
          });
        }}
        aria-label={t("option.metricOrder.removeNamed", { name })}
      >
        <IconX size={16} />
      </ActionIcon>
    </Group>
  );
};

export const MetricOrderPicker: MetricInput["AddButton"] = ({ addItem, values }) => {
  const t = useI18n("widget.healthMonitoring");
  const form = useFormContext();
  const automatic = getHealthMetricOrder({ ...form.values.options, metricOrder: [] });
  const choices = healthMetrics.filter((metric) => !values.includes(metric));
  const isAutomatic = values.length === 0;
  return (
    <Stack gap="xs">
      {choices.length > 0 && (
        <Select
          data-health-metric-picker
          label={t("option.metricOrder.add")}
          data={choices.map((metric) => ({ value: metric, label: t(`rework.${healthMetricLabels[metric]}`) }))}
          value={null}
          onChange={(value) => {
            if (isHealthMetric(value)) addItem(value);
          }}
          allowDeselect={false}
        />
      )}
      {isAutomatic && automatic.length > 0 && (
        <>
          <Text size="xs" c="dimmed">
            {t("option.metricOrder.automatic", {
              metrics: automatic.map((metric) => t(`rework.${healthMetricLabels[metric]}`)).join(", "),
            })}
          </Text>
          <Button
            variant="default"
            size="compact-sm"
            w="fit-content"
            data-health-metric-customize
            onClick={(event) => {
              const editor = event.currentTarget.form;
              form.setFieldValue("options.metricOrder", automatic);
              requestAnimationFrame(() => editor?.querySelector<HTMLElement>("[data-health-metric-handle]")?.focus());
            }}
          >
            {t("option.metricOrder.customize")}
          </Button>
        </>
      )}
      {!isAutomatic && (
        <Button
          variant="subtle"
          size="compact-sm"
          w="fit-content"
          onClick={(event) => {
            const editor = event.currentTarget.form;
            form.setFieldValue("options.metricOrder", []);
            requestAnimationFrame(() => {
              const control =
                editor?.querySelector<HTMLElement>("[data-health-metric-customize]") ??
                editor?.querySelector<HTMLElement>("[data-health-metric-picker]");
              control?.focus();
            });
          }}
        >
          {t("option.metricOrder.reset")}
        </Button>
      )}
    </Stack>
  );
};
