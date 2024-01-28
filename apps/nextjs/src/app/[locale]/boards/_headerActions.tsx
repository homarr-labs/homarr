"use client";

import type { ForwardedRef, ReactNode } from "react";
import { forwardRef } from "react";
import Link from "next/link";
import { useAtom } from "jotai";

import type { ActionIconProps } from "@homarr/ui";
import {
  ActionIcon,
  Group,
  IconBox,
  IconBoxAlignTop,
  IconChevronDown,
  IconPackageImport,
  IconPencil,
  IconPencilOff,
  IconPlus,
  IconSettings,
  Menu,
} from "@homarr/ui";

import { editModeAtom } from "~/components/board/editMode";
import { useRequiredBoard } from "./_context";

export const HeaderBoardActions = () => {
  const [editMode, setEditMode] = useAtom(editModeAtom);
  const board = useRequiredBoard();

  return (
    <>
      <Menu position="bottom-end" withArrow>
        <Menu.Target>
          <HeaderButton onClick={() => []} w="auto" px={4}>
            <Group gap={4} wrap="nowrap">
              <IconPlus stroke={1.5} />
              <IconChevronDown color="gray" size={16} />
            </Group>
          </HeaderButton>
        </Menu.Target>
        <Menu.Dropdown style={{ transform: "translate(-3px, 0)" }}>
          <Menu.Item leftSection={<IconBox size={20} />}>New Item</Menu.Item>
          <Menu.Item leftSection={<IconPackageImport size={20} />}>
            Import Item
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item leftSection={<IconBoxAlignTop size={20} />}>
            New Category
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <HeaderButton
        onClick={() => {
          setEditMode((em) => !em);
        }}
      >
        {editMode ? (
          <IconPencilOff stroke={1.5} />
        ) : (
          <IconPencil stroke={1.5} />
        )}
      </HeaderButton>

      <HeaderButton href={`/boards/${board.name}/settings`}>
        <IconSettings stroke={1.5} />
      </HeaderButton>
    </>
  );
};

type HeaderButtonProps = (
  | {
      onClick: () => void;
    }
  | {
      href: string;
    }
) & {
  children: ReactNode;
} & Partial<ActionIconProps>;

const headerButtonActionIconProps: ActionIconProps = {
  variant: "subtle",
  style: { border: "none" },
  color: "gray",
  size: "lg",
};

// eslint-disable-next-line react/display-name
export const HeaderButton = forwardRef<HTMLButtonElement, HeaderButtonProps>(
  (props, ref) => {
    if ("onClick" in props) {
      return (
        <ActionIcon ref={ref} {...props} {...headerButtonActionIconProps}>
          {props.children}
        </ActionIcon>
      );
    }
    return (
      <ActionIcon
        ref={ref as ForwardedRef<HTMLAnchorElement>}
        component={Link}
        {...props}
        {...headerButtonActionIconProps}
      >
        {props.children}
      </ActionIcon>
    );
  },
);
