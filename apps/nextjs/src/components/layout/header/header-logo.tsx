import type { ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";

import { useOptionalBoard } from "@homarr/boards/context";
import { Link } from "@homarr/ui";

import classes from "./header-logo.module.css";

interface HeaderLogoProps {
  display: "logo" | "logoAndText";
  logo: ReactNode;
  logoWithTitle: ReactNode;
  label: string;
}

export const HeaderLogo = ({ display, logo, logoWithTitle, label }: HeaderLogoProps) => {
  const board = useOptionalBoard();
  let href = "/";
  if (board) href = `/boards/${encodeURIComponent(board.name)}`;

  let content = logo;
  if (display === "logoAndText") content = logoWithTitle;

  return (
    <UnstyledButton component={Link} href={href} className={classes.root} data-display={display} aria-label={label}>
      {content}
    </UnstyledButton>
  );
};
