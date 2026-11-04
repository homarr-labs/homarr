"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Flex, FloatingIndicator, SegmentedControl, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import type { UrlTemplateMode } from "@homarr/definitions";
import { buildIntegrationUrl } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { normalizeServiceUrl } from "./discovery-selection";
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
  required?: boolean;
  addressAction?: ReactNode;
}

export const ServiceUrlTemplate = ({
  serverOrigin,
  onServerOriginChange,
  mode,
  onModeChange,
  required,
  addressAction,
}: ServiceUrlTemplateProps) => {
  const t = useI18n("common.serviceUrlTemplate");
  const sounds = useOnboardingSounds();
  const isMobile = useMediaQuery("(max-width: 36em)");
  const exampleUrl = normalizeServiceUrl(buildIntegrationUrl("sonarr", serverOrigin, mode));

  return (
    <Stack gap="sm" miw={0}>
      <Flex direction={{ base: "column", xs: "row" }} align={{ base: "stretch", xs: "end" }} gap="sm">
        <TextInput
          flex={1}
          miw={0}
          styles={{ input: { minHeight: 44 } }}
          label={t("serverTitle")}
          description={t("description")}
          placeholder="home.lan · 192.168.1.10 · https://homarr.example.com"
          value={serverOrigin}
          onChange={(event) => onServerOriginChange(event.currentTarget.value)}
          required={required}
          withAsterisk={required}
        />
        {addressAction}
      </Flex>
      <SegmentedControl<UrlTemplateMode>
        aria-label={t("urlModeLabel")}
        value={mode}
        onChange={(value) => {
          sounds.click();
          onModeChange(value);
        }}
        fullWidth
        size="md"
        orientation={isMobile ? "vertical" : "horizontal"}
        withItemsBorders={false}
        styles={{ label: { whiteSpace: "normal" } }}
        data={[
          { value: "hostPort", label: t("hostPort") },
          { value: "subdomain", label: t("subdomain") },
          { value: "path", label: t("path") },
        ]}
      />
      {exampleUrl && (
        <Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>
          {t("example", { url: exampleUrl })}
        </Text>
      )}
    </Stack>
  );
};
