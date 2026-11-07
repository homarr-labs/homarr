"use client";

import type { ReactNode } from "react";
import { Box, Combobox, createVarsResolver, factory, getSize, useProps, useStyles } from "@mantine/core";
import type { BoxProps, ElementProps, Factory, MantineSize, StylesApiProps } from "@mantine/core";

import classes from "./catalog-option.module.css";

export type CatalogOptionStylesNames = "root" | "icon" | "body" | "name" | "description" | "side" | "size";
export type CatalogOptionCssVariables = { root: "--catalog-option-icon-size" };

export interface CatalogOptionProps
  extends BoxProps, StylesApiProps<CatalogOptionFactory>, ElementProps<"div", "value"> {
  value: string;
  name: string;
  description?: string | null;
  icon: ReactNode;
  badges?: ReactNode;
  sizeLabel?: string;
  iconSize?: MantineSize | (string & {}) | number;
}

export type CatalogOptionFactory = Factory<{
  props: CatalogOptionProps;
  ref: HTMLDivElement;
  stylesNames: CatalogOptionStylesNames;
  vars: CatalogOptionCssVariables;
}>;

const defaultProps = { iconSize: 40 } satisfies Partial<CatalogOptionProps>;

const varsResolver = createVarsResolver<CatalogOptionFactory>((_theme, { iconSize }) => ({
  root: {
    "--catalog-option-icon-size":
      typeof iconSize === "number" ? `${iconSize}px` : getSize(iconSize, "catalog-option-icon"),
  },
}));

export const CatalogOption = factory<CatalogOptionFactory>((_props) => {
  const props = useProps("CatalogOption", defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    value,
    name,
    description,
    icon,
    badges,
    sizeLabel,
    iconSize: _iconSize,
    ...others
  } = props;

  const getStyles = useStyles<CatalogOptionFactory>({
    name: "CatalogOption",
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
    attributes,
    varsResolver,
  });

  return (
    <Combobox.Option value={value} {...getStyles("root")} {...others}>
      <Box {...getStyles("icon")}>{icon}</Box>
      <Box {...getStyles("body")}>
        <Box {...getStyles("name")}>{name}</Box>
        {description && <Box {...getStyles("description")}>{description}</Box>}
      </Box>
      <Box {...getStyles("side")}>
        {badges}
        {sizeLabel && <Box {...getStyles("size")}>{sizeLabel}</Box>}
      </Box>
    </Combobox.Option>
  );
});

CatalogOption.displayName = "CatalogOption";
CatalogOption.classes = classes;
