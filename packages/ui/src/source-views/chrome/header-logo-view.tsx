"use client";

import { UnstyledButton } from "@mantine/core";

import { Link } from "../../components/link";
import type { HeaderLogoViewProps } from "./contracts";
import classes from "./header-logo.module.css";

export const HeaderLogoView = ({ href, display, logo, logoWithTitle, label }: HeaderLogoViewProps) => {
  let content = logo;
  if (display === "logoAndText") content = logoWithTitle;

  return (
    <UnstyledButton component={Link} href={href} className={classes.root} data-display={display} aria-label={label}>
      {content}
    </UnstyledButton>
  );
};
