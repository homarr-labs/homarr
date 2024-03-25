import type { MouseEvent, PropsWithChildren } from "react";
import { useCallback } from "react";
import { useClickOutside, useMergedRef } from "@mantine/hooks";
import combineClasses from "clsx";
import { useAtom, useAtomValue } from "jotai";

import type { SectionKind, WidgetKind } from "@homarr/definitions";
import type { BoxProps } from "@homarr/ui";
import { Box } from "@homarr/ui";

import { editModeAtom } from "../../editMode";
import type { UseGridstackRefs } from "./use-gridstack";
import { selectedItemAtom } from "./use-gridstack";

interface Props extends BoxProps {
  id: string;
  type: "item" | "section";
  kind: WidgetKind | SectionKind;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
  refs: UseGridstackRefs;
  innerRef: React.RefObject<HTMLDivElement>;
}

export const GridStackItem = ({
  id,
  type,
  kind,
  xOffset,
  yOffset,
  width,
  height,
  innerRef,
  children,
  ...boxProps
}: PropsWithChildren<Props>) => {
  const clickOutsideRef = useClickOutside(() => {
    setSelected((prev) => (prev === id ? null : prev));
  });
  const mergedRef = useMergedRef(clickOutsideRef, innerRef);
  const [selected, setSelected] = useAtom(selectedItemAtom);
  const isEditMode = useAtomValue(editModeAtom);
  // TODO: Improve this?
  const onClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!isEditMode) return;
      const target = event.target as HTMLElement;
      if (target.classList.contains("ui-resizable-handle")) return;
      if (
        event.currentTarget
          .getElementsByClassName("mantine-ActionIcon-root")[0]
          ?.contains(target) ||
        target.classList.contains("mantine-ActionIcon-root")
      )
        return;
      setSelected((prev) => (prev === id ? null : id));
    },
    [isEditMode, id, setSelected],
  );

  return (
    <Box
      {...boxProps}
      className={combineClasses("grid-stack-item", boxProps.className)}
      style={{
        boxShadow:
          selected === id
            ? "inset 0px 0px 15px 10px var(--mantine-color-primaryColor-light)"
            : undefined,
        borderRadius: 8,
      }}
      data-id={id}
      data-type={type}
      data-kind={kind}
      gs-x={xOffset}
      gs-y={yOffset}
      gs-w={width}
      gs-h={height}
      gs-min-w={1}
      gs-min-h={1}
      onClick={onClick}
      ref={mergedRef}
    >
      {children}
    </Box>
  );
};
