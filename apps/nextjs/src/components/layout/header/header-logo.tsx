import type { ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";

import { Link } from "@homarr/ui";

import classes from "./header-logo.module.css";

interface HeaderLogoProps {
  display: "logo" | "logoAndText";
  logo: ReactNode;
  logoWithTitle: ReactNode;
  label: string;
}

export const HeaderLogo = ({ display, logo, logoWithTitle, label }: HeaderLogoProps) => {
  let content = logo;
  if (display === "logoAndText") content = logoWithTitle;

  return (
    <UnstyledButton
      component={Link}
      href="/"
      className={classes.root}
      data-display={display}
      aria-label={label}
    >
      {content}
    </UnstyledButton>
  );
};
