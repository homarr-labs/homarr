"use client";

import { IconExclamationMark } from "@tabler/icons-react";

import { usePrototypeEntityError } from "../../store";
import type { HaEntity } from "../../types";
import { useEntityDetailOpener } from "../e/details";
import classes from "./styles.module.css";

export function ActionStatus({ entity }: { entity: HaEntity }) {
  const error = usePrototypeEntityError(entity.id);
  const open = useEntityDetailOpener(entity.id);
  if (!error) return null;

  let outcome = "Action failed";
  if (error.kind === "unconfirmed") outcome = "Action not confirmed";
  let label = `${entity.name}: ${outcome}. ${error.message}`;
  if (open) label += ". Show details";

  return (
    <button
      type="button"
      className={classes.actionStatus}
      data-kind={error.kind}
      aria-label={label}
      title={label}
      disabled={!open}
      onClick={open ?? undefined}
    >
      <IconExclamationMark size={10} stroke={3} aria-hidden />
    </button>
  );
}
