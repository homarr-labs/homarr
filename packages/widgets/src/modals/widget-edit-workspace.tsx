"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { Box, Divider } from "@mantine/core";

import classes from "./widget-edit-modal.module.css";

/** Shared editor layout for widgets and containers, including the mobile layout. */
export const WidgetEditWorkspace = ({ preview, children }: PropsWithChildren<{ preview?: ReactNode }>) => (
  <Box className={classes.workspace} data-with-preview={preview ? true : undefined} data-with-settings>
    {preview}
    {preview && <Divider orientation="vertical" className={classes.previewDivider} />}
    {children}
  </Box>
);

export const WidgetEditFooter = ({ children }: PropsWithChildren) => <Box className={classes.footer}>{children}</Box>;
