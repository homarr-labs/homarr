/* eslint-disable react/no-unknown-property */ // Ignored because of gridstack attributes

import type { RefObject } from "react";

import { Card } from "@homarr/ui";
import { loadWidgetDynamic } from "@homarr/widgets";

import { Item } from "~/app/[locale]/boards/_types";
import type { UseGridstackRefs } from "./gridstack/use-gridstack";

interface Props {
  items: Item[];
  refs: UseGridstackRefs;
}

export const SectionContent = ({ items, refs }: Props) => {
  return (
    <>
      {items.map((item) => (
        <div
          key={item.id}
          className="grid-stack-item"
          data-id={item.id}
          gs-x={item.xOffset}
          gs-y={item.yOffset}
          gs-w={item.width}
          gs-h={item.height}
          gs-min-w={1}
          gs-min-h={1}
          gs-max-w={4}
          gs-max-h={4}
          ref={refs.items.current[item.id] as RefObject<HTMLDivElement>}
        >
          <Card className="grid-stack-item-content" withBorder>
            <Item item={item} />
          </Card>
        </div>
      ))}
    </>
  );
};

const Item = ({
  item
}: {
  item: Item;
}) => {
  const Comp = loadWidgetDynamic(item.kind);
  return <Comp options={item.options} integrations={item.integrations} />; // TODO: reduceWidgetOptionsWithDefaultValues
};
