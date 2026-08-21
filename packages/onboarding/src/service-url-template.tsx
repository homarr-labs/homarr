"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { FloatingIndicator, Stack, TextInput, UnstyledButton } from "@mantine/core";

import type { UrlTemplateMode } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { useOnboardingSounds } from "./use-onboarding-sounds";
import classes from "./onboarding-studio.module.css";

interface FloatingControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: ReactNode }[];
  ariaLabel: string;
}

export const OnboardingFloatingControl = <T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: FloatingControlProps<T>) => {
  const [rootRef, setRootRef] = useState<HTMLFieldSetElement | null>(null);
  const controlRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sounds = useOnboardingSounds();

  return (
    <div className={classes.floatingControlScroller}>
      <fieldset ref={setRootRef} className={classes.floatingControlRoot} aria-label={ariaLabel}>
        <FloatingIndicator
          target={controlRefs.current[value] ?? null}
          parent={rootRef}
          className={classes.floatingControlIndicator}
        />
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <UnstyledButton
              key={option.value}
              ref={(node) => {
                controlRefs.current[option.value] = node;
              }}
              type="button"
              className={classes.floatingControl}
              data-active={selected}
              aria-pressed={selected}
              onClick={() => {
                sounds.click();
                onChange(option.value);
              }}
            >
              {option.label}
            </UnstyledButton>
          );
        })}
      </fieldset>
    </div>
  );
};

interface ServiceUrlTemplateProps {
  serverOrigin: string;
  onServerOriginChange: (value: string) => void;
  mode: UrlTemplateMode;
  onModeChange: (value: UrlTemplateMode) => void;
  readOnly?: boolean;
  required?: boolean;
}

export const ServiceUrlTemplate = ({
  serverOrigin,
  onServerOriginChange,
  mode,
  onModeChange,
  readOnly,
  required,
}: ServiceUrlTemplateProps) => {
  const t = useI18n("common.serviceUrlTemplate");

  return (
    <Stack gap="sm">
      <TextInput
        label={t("serverTitle")}
        placeholder="home.lan · 192.168.1.10 · https://homarr.example.com"
        value={serverOrigin}
        onChange={(event) => onServerOriginChange(event.currentTarget.value)}
        readOnly={readOnly}
        required={required}
        withAsterisk={required}
      />
      <OnboardingFloatingControl
        ariaLabel={t("urlModeLabel")}
        value={mode}
        onChange={onModeChange}
        options={[
          { value: "hostPort", label: t("hostPort") },
          { value: "subdomain", label: t("subdomain") },
          { value: "path", label: t("path") },
        ]}
      />
    </Stack>
  );
};
