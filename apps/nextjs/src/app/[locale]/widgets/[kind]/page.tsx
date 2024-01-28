"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { notFound } from "next/navigation";

import type { WidgetKind } from "@homarr/definitions";
import { ActionIcon, Affix, Center, IconPencil } from "@homarr/ui";
import { loadWidgetDynamic, widgetImports } from "@homarr/widgets";

import { modalEvents } from "../../modals";

type Props = PropsWithChildren<{ params: { kind: string } }>;

export default function WidgetPreview(props: Props) {
  const [options, setOptions] = useState<Record<string, unknown>>({});
  if (!(props.params.kind in widgetImports)) {
    notFound();
  }

  const kind = props.params.kind as WidgetKind;
  const Comp = loadWidgetDynamic(kind);

  return (
    <Center h="100vh">
      <Comp options={options as never} integrations={[]} />
      <Affix bottom={12} right={72}>
        <ActionIcon
          size={48}
          variant="default"
          radius="xl"
          onClick={() => {
            return modalEvents.openManagedModal({
              modal: "widgetEditModal",
              innerProps: {
                kind,
                value: options,
                onSuccessfulEdit: (options) => setOptions(options),
              },
            });
          }}
        >
          <IconPencil size={24} />
        </ActionIcon>
      </Affix>
    </Center>
  );
}
