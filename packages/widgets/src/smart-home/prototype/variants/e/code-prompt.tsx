"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { PasswordInput } from "@mantine/core";

import { isUnavailable } from "../../semantics";
import { usePrototypeInteractionBlock, usePrototypePending } from "../../store";
import type { HaEntity } from "../../types";
import { entityNeedsCode } from "./capabilities";
import { CodeContext } from "./hooks";

interface CodePromptProps {
  entity: HaEntity;
  children: ReactNode;
}

export function CodePrompt({ entity, children }: CodePromptProps) {
  const [code, setCode] = useState("");
  const blocked = usePrototypeInteractionBlock();
  const pending = usePrototypePending(entity.id);
  if (!entityNeedsCode(entity)) return children;
  const disabled = blocked !== null || entity.readOnly || isUnavailable(entity);

  return (
    <CodeContext.Provider value={disabled ? "" : code}>
      <PasswordInput
        label="Security code"
        description="Enter your code, then choose an action below. The code is cleared when you close these details."
        autoComplete="off"
        inputMode={entity.attributes.codeFormat === "number" ? "numeric" : "text"}
        value={code}
        onChange={(event) => setCode(event.currentTarget.value)}
        disabled={disabled || pending}
        visibilityToggleButtonProps={{ "aria-label": "Show or hide security code" }}
        visibilityToggleFocusable
        size="lg"
        radius="md"
        mb="sm"
        rightSectionWidth={48}
        styles={{ visibilityToggle: { width: 44, height: 44 } }}
      />
      {children}
    </CodeContext.Provider>
  );
}
