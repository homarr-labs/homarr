import type { PropsWithChildren } from "react";
import { Fragment, useEffect, useRef } from "react";
import { ActionIcon, Group, Indicator, Menu, Popover, Stack, UnstyledButton } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";

import { useConfirmModal } from "@homarr/modals";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import type { DynamicSection } from "~/app/[locale]/boards/_types";
import { useEditMode, useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";
import { useDynamicSectionActions } from "./dynamic-actions";
import { useAboveDynamicSectionIds } from "./dynamic-context";

export const BoardDynamicSectionMenu = ({ section }: { section: DynamicSection }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isEditMode] = useEditMode();
  const aboveIds = useAboveDynamicSectionIds();
  const board = useRequiredBoard();
  const hasItemInTopRightCorner =
    section.items.some((item) => item.xOffset + item.width === section.width && item.yOffset === 0) ||
    board.sections.some(
      (innerSection) =>
        innerSection.kind === "dynamic" &&
        innerSection.parentSectionId === section.id &&
        innerSection.xOffset + innerSection.width == section.width &&
        innerSection.yOffset == 0,
    );

  if (!isEditMode) return null;

  if (aboveIds.length >= 1 && !hasItemInTopRightCorner) {
    return (
      <Popover width="auto" position="right" withArrow shadow="md" returnFocus>
        <Popover.Target popupType="menu">
          <UnstyledButton
            pos="absolute"
            top={4}
            right={4}
            style={{ zIndex: 10 }}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                document.querySelectorAll<HTMLButtonElement>("[data-section-item]")[0]?.focus();
              }
            }}
          >
            <Indicator label={aboveIds.length + 1} styles={{ indicator: { height: "1rem" } }} offset={4}>
              <ActionIcon component="div" variant="default" radius={"xl"}>
                <IconDotsVertical size={"1rem"} />
              </ActionIcon>
            </Indicator>
          </UnstyledButton>
        </Popover.Target>
        <Popover.Dropdown
          ref={dropdownRef}
          role="menu"
          aria-orientation="vertical"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              document.querySelectorAll<HTMLButtonElement>("[data-section-item]")[0]?.focus();
            }
          }}
        >
          <div tabIndex={-1} data-autofocus data-mantine-stop-propagation style={{ outline: 0 }} />
          <Stack>
            {[...aboveIds, section.id].map((id, index) => (
              <Fragment key={id}>
                <Group hiddenFrom="md"></Group>
                <DesktopButton id={id} index={index} />
              </Fragment>
            ))}
          </Stack>
        </Popover.Dropdown>
      </Popover>
    );
  }

  if (aboveIds.length >= 1 && !hasItemInTopRightCorner) {
    return (
      <InnerMenu id={section.id}>
        <ActionIcon variant="default" radius={"xl"} pos="absolute" top={4} right={4} style={{ zIndex: 10 }}>
          <IconDotsVertical size={"1rem"} />
        </ActionIcon>
      </InnerMenu>
    );
  }

  return null;
};

interface DesktopButtonProps {
  index: number;
  id: string;
}

const DesktopButton = ({ index, id }: DesktopButtonProps) => {
  const { hovered, ref } = useHover<HTMLButtonElement>();
  useEffect(() => {
    const sectionRef = document.querySelector<HTMLDivElement>(`[data-section-id="${id}"]`);
    if (!sectionRef) return;

    if (hovered) {
      const previousBackground = sectionRef.style.backgroundColor;
      sectionRef.style.backgroundColor = "rgba(255, 0, 0, 0.1)";

      return () => {
        sectionRef.style.backgroundColor = previousBackground;
      };
    }
  }, [hovered]);

  return (
    <InnerMenu id={id} trigger="hover">
      <UnstyledButton data-section-item visibleFrom="md" ref={ref}>
        Section {index + 1}
      </UnstyledButton>
    </InnerMenu>
  );
};

const InnerMenu = ({ children, id, trigger }: PropsWithChildren<{ id: string; trigger?: "hover" }>) => {
  const t = useI18n();
  const tDynamic = useScopedI18n("section.dynamic");
  const { removeDynamicSection } = useDynamicSectionActions();
  const { openConfirmModal } = useConfirmModal();
  const openRemoveModal = () => {
    openConfirmModal({
      title: tDynamic("remove.title"),
      children: tDynamic("remove.message"),
      onConfirm: () => {
        removeDynamicSection({ id });
      },
    });
  };

  return (
    <Menu withinPortal withArrow position="right-start" arrowPosition="center" trigger={trigger}>
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown miw={128}>
        <Menu.Label c="red.6">{t("common.dangerZone")}</Menu.Label>
        <Menu.Item c="red.6" leftSection={<IconTrash size={16} />} onClick={openRemoveModal}>
          {tDynamic("action.remove")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
