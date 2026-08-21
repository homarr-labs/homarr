"use client";

import type { ReactNode } from "react";
import {
  Box,
  createVarsResolver,
  factory,
  Group,
  LoadingOverlay,
  Text,
  Tooltip,
  useProps,
  useStyles,
} from "@mantine/core";
import type { BoxProps, ElementProps, Factory, MantineRadius, StylesApiProps } from "@mantine/core";

import classes from "./selectable-card.module.css";

export type SelectableCardStylesNames = "root" | "header" | "body" | "footer";
export type SelectableCardCssVariables = {
  root: "--selectable-card-radius";
};

export interface SelectableCardProps
  extends BoxProps, StylesApiProps<SelectableCardFactory>, Omit<ElementProps<"button">, "title"> {
  icon?: ReactNode;
  title?: ReactNode;
  topRight?: ReactNode;
  description?: string | null;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  selected?: boolean;
  loading?: boolean;
  disabled?: boolean;
  radius?: MantineRadius;
  children?: ReactNode;
}

export type SelectableCardFactory = Factory<{
  props: SelectableCardProps;
  ref: HTMLButtonElement;
  stylesNames: SelectableCardStylesNames;
  vars: SelectableCardCssVariables;
}>;

const defaultProps: Partial<SelectableCardProps> = {
  type: "button",
};

const varsResolver = createVarsResolver<SelectableCardFactory>((_theme, { radius }) => ({
  root: {
    "--selectable-card-radius": radius ? `var(--mantine-radius-${radius})` : undefined,
  },
}));

export const SelectableCard = factory<SelectableCardFactory>((_props) => {
  const props = useProps("SelectableCard", defaultProps, _props);
  const {
    ref,
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    icon,
    title,
    topRight,
    description,
    footerLeft,
    footerRight,
    selected,
    loading = false,
    disabled = false,
    children,
    type = "button",
    ...others
  } = props;

  const getStyles = useStyles<SelectableCardFactory>({
    name: "SelectableCard",
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
    <Box
      component="button"
      {...others}
      type={type}
      ref={ref}
      disabled={disabled || loading}
      data-selected={selected || undefined}
      aria-pressed={selected !== undefined ? selected : undefined}
      {...getStyles("root")}
    >
      <LoadingOverlay visible={loading} loaderProps={{ size: "sm" }} />

      {/* Header Section: Inset background with Title that never elides before the category */}
      {(icon || title || topRight) && (
        <Box {...getStyles("header")}>
          <Group
            justify="space-between"
            align="center"
            wrap="nowrap"
            gap="xs"
            style={{ width: "100%", overflow: "hidden" }}
          >
            <Group gap="xs" wrap="nowrap" style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}>
              {icon}
              {typeof title === "string" ? (
                <Text
                  fw={700}
                  size="md"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {title}
                </Text>
              ) : (
                title
              )}
            </Group>
            {topRight && (
              <Box
                style={{
                  minWidth: 0,
                  flexShrink: 0,
                }}
              >
                {topRight}
              </Box>
            )}
          </Group>
        </Box>
      )}

      {/* Body: Custom Children or Default Description */}
      {children ? (
        <Box {...getStyles("body")}>{children}</Box>
      ) : description !== undefined ? (
        <Box {...getStyles("body")}>
          <Tooltip label={description} multiline w={260} disabled={!description}>
            <Text size="sm" c="dimmed" lineClamp={2} lh={1.35}>
              {description}
            </Text>
          </Tooltip>
        </Box>
      ) : null}

      {/* Footer Section: Inset Dashed Bottom Meta */}
      {(footerLeft || footerRight) && (
        <Box {...getStyles("footer")}>
          <Group justify="space-between" align="center" wrap="nowrap" gap="xs" style={{ width: "100%" }}>
            <Box style={{ minWidth: 0, flexShrink: 1 }}>{footerLeft}</Box>
            <Box style={{ minWidth: 0, flexShrink: 0 }}>{footerRight}</Box>
          </Group>
        </Box>
      )}
    </Box>
  );
});

SelectableCard.displayName = "@homarr/ui/SelectableCard";
SelectableCard.classes = classes;
