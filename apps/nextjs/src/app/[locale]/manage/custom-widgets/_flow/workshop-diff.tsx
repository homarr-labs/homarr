"use client";

import { Accordion, Code, SimpleGrid, Stack, Text } from "@mantine/core";

import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

function reviewSections(widget: HomarrCustomWidgetV2) {
  return {
    sources: Object.fromEntries(
      Object.entries(widget.sources).map(([id, source]) => {
        const { auth: _auth, ...connection } = source;
        return [id, connection];
      }),
    ),
    authentication: Object.fromEntries(Object.entries(widget.sources).map(([id, source]) => [id, source.auth])),
    queries: Object.fromEntries(Object.entries(widget.requests).filter(([, request]) => request.kind === "query")),
    actions: Object.fromEntries(Object.entries(widget.requests).filter(([, request]) => request.kind === "action")),
    permissions: Object.fromEntries(Object.entries(widget.requests).map(([id, request]) => [id, request.permission])),
    options: widget.options,
    template: widget.template,
    native: widget.extensions?.native ?? {},
    stylesheet: widget.extensions?.stylesheet ?? "",
    fragments: widget.extensions?.fragments ?? {},
    preferences: widget.extensions?.preferences ?? {},
    content: widget.extensions?.content ?? {},
  };
}

function display(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function WorkshopUpdateDiff({
  current,
  incoming,
}: {
  current: HomarrCustomWidgetV2;
  incoming: HomarrCustomWidgetV2;
}) {
  const t = useI18n("customWidget.flow");
  const before = reviewSections(current);
  const after = reviewSections(incoming);
  const fields = (Object.keys(before) as (keyof typeof before)[]).filter(
    (field) => display(before[field]) !== display(after[field]),
  );
  return (
    <Accordion multiple variant="contained">
      {fields.map((field) => (
        <Accordion.Item key={field} value={field}>
          <Accordion.Control>{t(`diff.${field}`)}</Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text size="xs">{t("installed")}</Text>
                <Code block style={{ maxHeight: 260, overflow: "auto" }}>
                  {display(before[field])}
                </Code>
              </Stack>
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text size="xs">{t("upstream")}</Text>
                <Code block style={{ maxHeight: 260, overflow: "auto" }}>
                  {display(after[field])}
                </Code>
              </Stack>
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
