"use client";

import type { ReactNode } from "react";

import type { TablerIcon } from "@homarr/ui";

import type { HaEntity } from "../../types";
import { getColumnCount, getLevel, showsTitle } from "./layout";
import type { Section, Vars } from "./meta";
import { getToneVars } from "./meta";
import { EntityRow } from "./row";
import classes from "./styles.module.css";

export interface ChipDef {
  key: string;
  label: string;
  count: number | string;
  color: string;
  icon?: TablerIcon;
}

interface HeaderProps {
  title: string;
  icon: TablerIcon;
  meta?: ReactNode;
  chips: ChipDef[];
  filter: string | null;
  onFilter: (key: string | null) => void;
  height: number;
}

export function ChipButton({ chip, active, onClick }: { chip: ChipDef; active: boolean; onClick: () => void }) {
  const Icon = chip.icon;
  return (
    <button
      type="button"
      className={classes.filterChip}
      aria-pressed={active}
      data-empty={chip.count === 0 || undefined}
      style={getToneVars(chip.color) as Vars}
      onClick={onClick}
    >
      {Icon ? <Icon size={13} stroke={2} /> : <span className={classes.dot} />}
      <b>{chip.count}</b>
      <span>{chip.label}</span>
    </button>
  );
}

export function ListHeader({ title, icon: Icon, meta, chips, filter, onFilter, height }: HeaderProps) {
  const withTitle = showsTitle(height);
  return (
    <header className={classes.header}>
      {withTitle && (
        <div className={classes.titleRow}>
          <Icon size={16} stroke={1.9} className={classes.titleIcon} aria-hidden />
          <h3 className={classes.title}>{title}</h3>
          <div className={classes.meta}>{meta}</div>
        </div>
      )}
      {chips.length > 0 && (
        <div className={classes.chips} role="group" aria-label="Filter">
          {chips.map((chip) => (
            <ChipButton
              key={chip.key}
              chip={chip}
              active={filter === chip.key}
              onClick={() => onFilter(filter === chip.key ? null : chip.key)}
            />
          ))}
        </div>
      )}
    </header>
  );
}

interface SectionsProps {
  sections: Section[];
  width: number;
  showArea?: boolean;
  emptyLabel?: string;
}

export function Sections({ sections, width, showArea = false, emptyLabel = "Nothing to show" }: SectionsProps) {
  const columns = getColumnCount(width);
  const level = getLevel(width / columns);
  const visible = sections.filter((section) => section.entities.length > 0);

  if (visible.length === 0) return <div className={classes.empty}>{emptyLabel}</div>;

  return (
    <div className={classes.columns} data-list data-cols={columns} style={{ "--cols": columns } as Vars}>
      {visible.map((section) => (
        <section key={section.key} className={classes.section}>
          <div className={classes.sectionHeader}>
            <span>{section.title}</span>
            <span className={classes.sectionCount}>{section.entities.length}</span>
          </div>
          {section.entities.map((entity: HaEntity) => (
            <EntityRow key={entity.id} entity={entity} level={level} showArea={showArea} />
          ))}
        </section>
      ))}
    </div>
  );
}

interface ShellProps extends HeaderProps, SectionsProps {}

export function ListShell({ title, icon, meta, chips, filter, onFilter, height, ...sectionProps }: ShellProps) {
  return (
    <>
      <ListHeader
        title={title}
        icon={icon}
        meta={meta}
        chips={chips}
        filter={filter}
        onFilter={onFilter}
        height={height}
      />
      <div className={classes.scroll}>
        <Sections {...sectionProps} />
      </div>
    </>
  );
}
