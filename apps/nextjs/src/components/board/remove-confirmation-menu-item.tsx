"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Menu } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

interface BoardRemoveConfirmationMenuItemProps {
  label: ReactNode;
  confirmationLabel: ReactNode;
  onConfirm: () => void;
}

export const BoardRemoveConfirmationMenuItem = ({
  label,
  confirmationLabel,
  onConfirm,
}: BoardRemoveConfirmationMenuItemProps) => {
  const [isConfirmationRequired, setIsConfirmationRequired] = useState(false);

  return (
    <Menu.Item
      c="red.6"
      leftSection={<IconTrash size={16} />}
      closeMenuOnClick={isConfirmationRequired}
      onBlur={() => setIsConfirmationRequired(false)}
      onClick={() => {
        if (isConfirmationRequired) {
          onConfirm();
          return;
        }

        setIsConfirmationRequired(true);
      }}
    >
      {isConfirmationRequired ? confirmationLabel : label}
    </Menu.Item>
  );
};
