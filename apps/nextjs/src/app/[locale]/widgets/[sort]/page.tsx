"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { notFound } from "next/navigation";

import { ActionIcon, Affix, Center, IconPencil } from "@homarr/ui";
import type { WidgetSort } from "@homarr/widgets";
import { loadWidgetDynamic, widgetImports } from "@homarr/widgets";

import { modalEvents } from "../../modals";

type Props = PropsWithChildren<{ params: { sort: string } }>;

export default function WidgetPreview(props: Props) {
  const [options, setOptions] = useState<Record<string, unknown>>({});
  if (!(props.params.sort in widgetImports)) {
    notFound();
  }

  const sort = props.params.sort as WidgetSort;
  const Comp = loadWidgetDynamic(sort);

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
                sort,
                definition: widgetImports[sort].definition.options,
                state: [options, setOptions],
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
