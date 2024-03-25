import { useSectionContext } from "./context";
import { GridStackItem } from "./gridstack/gridstack-item";
import type { UseGridstackRefs } from "./gridstack/use-gridstack";

const getItemRef = (refs: UseGridstackRefs, id: string) => {
  return refs.items.current[id] as React.RefObject<HTMLDivElement>;
};

const SectionContent = () => {
  const { section, innerSections, refs } = useSectionContext();

  return (
    <>
      {section.items.map((item) => (
        <GridStackItem
          key={item.id}
          refs={refs}
          type="item"
          {...item}
          innerRef={getItemRef(refs, item.id)}
        >
          <ItemContent item={item} />
        </GridStackItem>
      ))}
      {innerSections.map((section) => (
        <GridStackItem
          key={section.id}
          refs={refs}
          type="section"
          {...section}
          innerRef={getItemRef(refs, section.id)}
        >
          {/* TODO: Move to different file and differentiate between different things */}
          <Card withBorder className="grid-stack-item-content">
            <GridStack section={section} h="100%">
              <SectionContent />
            </GridStack>
          </Card>
        </GridStackItem>
      ))}
    </>
  );
};
