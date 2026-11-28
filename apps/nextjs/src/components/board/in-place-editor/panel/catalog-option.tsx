"use client";

import { Badge, Box, factory, Image, useProps, useStyles } from "@mantine/core";
import type { BoxProps, ElementProps, Factory, StylesApiProps } from "@mantine/core";
import { IconApps } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import type { CatalogEntry } from "../catalog";
import classes from "./catalog-option.module.css";

export type CatalogOptionStylesNames = "root" | "icon" | "body" | "name" | "description" | "meta" | "size";

export interface CatalogOptionProps
  extends BoxProps, StylesApiProps<CatalogOptionFactory>, Omit<ElementProps<"div">, "children"> {
  entry: CatalogEntry;
}

export type CatalogOptionFactory = Factory<{
  props: CatalogOptionProps;
  ref: HTMLDivElement;
  stylesNames: CatalogOptionStylesNames;
}>;

const defaultProps = {} satisfies Partial<CatalogOptionProps>;

const EntryIcon = ({ entry }: { entry: CatalogEntry }) => {
  if (entry.type === "app") {
    if (!entry.iconUrl) return <IconApps size={18} stroke={1.5} />;
    return <Image src={entry.iconUrl} w={22} h={22} fit="contain" alt="" />;
  }
  const Icon = entry.icon;
  return <Icon size={19} stroke={1.5} />;
};

export const CatalogOption = factory<CatalogOptionFactory>((_props) => {
  const t = useI18n();
  const props = useProps("CatalogOption", defaultProps, _props);
  const { classNames, className, style, styles, unstyled, vars, attributes, entry, ...others } = props;

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
  });

  const description = entry.description || (entry.type === "app" ? t("widget.app.name") : "");
  const needsSetup = entry.connectionStatus === "needsSetup";
  const showBestFit = entry.bestFit && entry.type !== "app";

  return (
    <Box {...getStyles("root")} {...others}>
      <Box {...getStyles("icon")}>
        <EntryIcon entry={entry} />
      </Box>
      <Box {...getStyles("body")}>
        <Box {...getStyles("name")}>{entry.name}</Box>
        {description && <Box {...getStyles("description")}>{description}</Box>}
      </Box>
      <Box {...getStyles("meta")}>
        {showBestFit && (
          <Badge size="xs" variant="light" title={t("item.inPlace.defaultFitDescription")}>
            {t("item.inPlace.defaultFit")}
          </Badge>
        )}
        {needsSetup && (
          <Badge size="xs" variant="light" color="gray">
            {t("item.create.connectionStatus.needsSetup")}
          </Badge>
        )}
        {entry.type === "workshop" ? (
          <Badge size="xs" variant="light">
            {t("workshop.title")}
          </Badge>
        ) : (
          <Box {...getStyles("size")} title={t("item.inPlace.defaultSizeDescription")}>
            {t("item.inPlace.defaultSize", { width: entry.defaultSize.width, height: entry.defaultSize.height })}
          </Box>
        )}
      </Box>
    </Box>
  );
});

CatalogOption.displayName = "CatalogOption";
CatalogOption.classes = classes;
