"use client";

import { useId, useState } from "react";
import { Accordion } from "@mantine/core";

import type { LazyOnceAccordionProps } from "./contracts";

export function LazyOnceAccordion({ label, children }: LazyOnceAccordionProps) {
  const id = useId();
  const [value, setValue] = useState<string | null>(null);
  const [hasOpened, setHasOpened] = useState(false);
  const controlId = `${id}-control`;
  const panelId = `${id}-panel`;

  const handleChange = (nextValue: string | null) => {
    setValue(nextValue);
    if (nextValue === "content") setHasOpened(true);
  };

  return (
    <Accordion variant="contained" value={value} onChange={handleChange}>
      <Accordion.Item value="content">
        <Accordion.Control id={controlId} aria-controls={panelId}>
          {label}
        </Accordion.Control>
        <div
          id={panelId}
          className={Accordion.classes.panel}
          role="region"
          aria-labelledby={controlId}
          hidden={value !== "content"}
        >
          <div className={Accordion.classes.content}>{hasOpened && children}</div>
        </div>
      </Accordion.Item>
    </Accordion>
  );
}
