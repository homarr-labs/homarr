import type { ReactNode } from "react";
import { Box, createVarsResolver, factory, getRadius, useProps, useStyles } from "@mantine/core";
import type { BoxProps, ElementProps, Factory, MantineRadius, StylesApiProps } from "@mantine/core";

import classes from "./gallery-card.module.css";

export type GalleryCardMarker = "bestFit" | "fits" | "larger" | "setup";

export type GalleryCardStylesNames = "root" | "thumb" | "tile" | "body" | "name" | "description" | "marker" | "size";
export type GalleryCardCssVariables = { root: "--gc-radius" | "--gc-bg" | "--gc-color" };

export interface GalleryCardProps extends BoxProps, StylesApiProps<GalleryCardFactory>, ElementProps<"div"> {
  name: string;
  description?: string | null;
  icon: ReactNode;
  tileWidth: number;
  tileHeight: number;
  accent?: string;
  selected?: boolean;
  marker?: GalleryCardMarker;
  orientation?: "vertical" | "horizontal";
  radius?: MantineRadius;
}

export type GalleryCardFactory = Factory<{
  props: GalleryCardProps;
  ref: HTMLDivElement;
  stylesNames: GalleryCardStylesNames;
  vars: GalleryCardCssVariables;
}>;

const defaultProps = { radius: "lg", accent: "gray", orientation: "vertical" } satisfies Partial<GalleryCardProps>;

const markerLabels: Record<GalleryCardMarker, string> = {
  bestFit: "Best fit",
  fits: "Fits",
  larger: "Larger",
  setup: "Needs setup",
};

const unit = 24;

const varsResolver = createVarsResolver<GalleryCardFactory>((_theme, { radius, accent }) => ({
  root: {
    "--gc-radius": getRadius(radius),
    "--gc-bg": `var(--mantine-color-${accent}-light)`,
    "--gc-color": `var(--mantine-color-${accent}-light-color)`,
  },
}));

export const GalleryCard = factory<GalleryCardFactory>((_props) => {
  const props = useProps("GalleryCard", defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    attributes,
    name,
    description,
    icon,
    tileWidth,
    tileHeight,
    accent: _accent,
    selected,
    marker,
    orientation,
    radius: _radius,
    ...others
  } = props;

  const getStyles = useStyles<GalleryCardFactory>({
    name: "GalleryCard",
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

  const tileStyle =
    orientation === "horizontal"
      ? { width: 44, height: 44 }
      : { width: tileWidth * unit + (tileWidth - 1) * 4, height: tileHeight * unit + (tileHeight - 1) * 4 };

  return (
    <Box {...getStyles("root")} {...others} data-selected={selected || undefined} data-orientation={orientation}>
      <Box {...getStyles("size")}>
        {tileWidth}×{tileHeight}
      </Box>
      <Box {...getStyles("thumb")}>
        <Box {...getStyles("tile", { style: tileStyle })}>{icon}</Box>
      </Box>
      <Box {...getStyles("body")}>
        <Box {...getStyles("name")}>{name}</Box>
        {description && <Box {...getStyles("description")}>{description}</Box>}
        {marker && (
          <Box {...getStyles("marker")} data-kind={marker}>
            {markerLabels[marker]}
          </Box>
        )}
      </Box>
    </Box>
  );
});

GalleryCard.displayName = "GalleryCard";
GalleryCard.classes = classes;
