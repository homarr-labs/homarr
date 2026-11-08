"use client";

import { useContext } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

import type { TablerIcon } from "@homarr/ui";

import { getEntityIcon, getStateColor, isEntityActive, isUnavailable } from "../../semantics";
import { usePrototypeEntityError } from "../../store";
import type { HaEntity } from "../../types";
import { TileEntityContext, useDetailOpener, useDeviceControlDisabled } from "./hooks";
import classes from "./styles.module.css";

const darkInk = "#17181c";
const darkOnColors = new Set(["yellow", "orange", "lime", "cyan", "teal"]);
const untintedDomains = new Set(["sensor", "weather", "scene", "button", "input_select", "sun", "update"]);

export interface EntityTheme {
  accent: string;
  onAccent: string;
  active: boolean;
  tinted: boolean;
  unavailable: boolean;
  Icon: TablerIcon;
}

const luminance = ([red, green, blue]: [number, number, number]) =>
  (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

export const getTheme = (entity: HaEntity): EntityTheme => {
  const colorName = getStateColor(entity);
  const active = isEntityActive(entity);
  const unavailable = isUnavailable(entity);
  const rgb = entity.domain === "light" && entity.state === "on" ? entity.attributes.rgbColor : undefined;
  const accent = rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : `var(--mantine-color-${colorName}-filled)`;
  const dark = rgb ? luminance(rgb) > 0.55 : darkOnColors.has(colorName);
  return {
    accent,
    onAccent: dark ? darkInk : "#fff",
    active,
    tinted: active && !untintedDomains.has(entity.domain),
    unavailable,
    Icon: getEntityIcon(entity),
  };
};

export const accentVars = (accent: string, onAccent: string) =>
  ({ "--accent": accent, "--on-accent": onAccent }) as CSSProperties;

interface TileProps {
  theme: EntityTheme;
  children: ReactNode;
  bare?: boolean;
  media?: boolean;
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  label?: string;
}

export function Tile({ theme, children, bare, media, className, onClick, label }: TileProps) {
  const style = media ? accentVars("#fff", darkInk) : accentVars(theme.accent, theme.onAccent);
  const error = usePrototypeEntityError(useContext(TileEntityContext) ?? "");
  const disabled = useDeviceControlDisabled(theme.unavailable);
  const openDetail = useDetailOpener();
  const common = {
    className: `${classes.tile} ${className ?? ""}`,
    style,
    title: error?.message,
    "data-error": error?.kind,
    "data-active": theme.tinted,
    "data-unavailable": theme.unavailable,
    "data-bare": bare ?? false,
    "data-media": media ?? false,
    "data-controls-disabled": disabled,
  };

  if (onClick) {
    const detailsOnly = disabled && openDetail !== null;
    return (
      <button
        type="button"
        {...common}
        onClick={detailsOnly ? openDetail : onClick}
        aria-label={detailsOnly ? `${label ?? "Entity"}, show details` : label}
        aria-haspopup={detailsOnly ? "dialog" : undefined}
        disabled={disabled && !detailsOnly}
      >
        {children}
      </button>
    );
  }
  return <div {...common}>{children}</div>;
}

interface HeadProps {
  name: string;
  state: string;
  trailing?: ReactNode;
  leading?: ReactNode;
}

export function Head({ name, state, trailing, leading }: HeadProps) {
  const openDetail = useDetailOpener();
  const text = (
    <>
      <span className={classes.name} title={name}>
        {name}
      </span>
      <span className={classes.state}>{state}</span>
    </>
  );

  return (
    <div className={classes.head}>
      {leading}
      {openDetail ? (
        <button
          type="button"
          className={`${classes.headText} ${classes.headButton}`}
          aria-haspopup="dialog"
          aria-label={[name, state, "show details"].filter(Boolean).join(", ")}
          onClick={openDetail}
        >
          {text}
        </button>
      ) : (
        <div className={classes.headText}>{text}</div>
      )}
      {trailing}
    </div>
  );
}

interface EmptyProps {
  title: string;
  hint?: string;
}

export function Empty({ title, hint }: EmptyProps) {
  return (
    <div className={classes.empty}>
      <span className={classes.emptyTitle}>{title}</span>
      {hint ? <span className={classes.emptyHint}>{hint}</span> : null}
    </div>
  );
}
