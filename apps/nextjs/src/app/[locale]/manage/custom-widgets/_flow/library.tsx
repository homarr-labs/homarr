"use client";
import { Accordion, Button, Group, Text, Tooltip } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import type { FlowKind } from "./graph";

const primaryKinds = ["source", "query", "action", "options", "native"] as const;
const additionalKinds = ["fragment", "preference", "content"] as const;

export function WorkbenchNodeLibrary({ editable, onAdd }: { editable: boolean; onAdd(kind: FlowKind): void }) {
  const t = useI18n("customWidget.flow");
  const buttons = (kinds: readonly ((typeof primaryKinds)[number] | (typeof additionalKinds)[number])[]) => (
    <Group gap={4}>
      {kinds.map((kind) => (
        <Tooltip
          key={kind}
          label={t(`nodeHelp.${kind}`)}
          multiline
          w={240}
          events={{ hover: true, focus: true, touch: true }}
        >
          <Button disabled={!editable} type="button" size="compact-xs" variant="light" onClick={() => onAdd(kind)}>
            {t(`kind.${kind}`)}
          </Button>
        </Tooltip>
      ))}
    </Group>
  );
  return (
    <>
      <Text size="xs" fw={600} c="dimmed" mt="md" mb={4}>
        {t("add")}
      </Text>
      <Text size="xs" c="dimmed" mb="xs">
        {t("libraryHint")}
      </Text>
      {buttons(primaryKinds)}
      <Accordion mt="xs" variant="default" styles={{ control: { padding: 0 }, content: { padding: "0 0 8px" } }}>
        <Accordion.Item value="composition">
          <Accordion.Control>
            <Text size="xs">{t("moreBlocks")}</Text>
          </Accordion.Control>
          <Accordion.Panel>{buttons(additionalKinds)}</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      {!editable && (
        <Text size="xs" c="orange" mt="xs">
          {t("invalidGraphJson")}
        </Text>
      )}
    </>
  );
}
