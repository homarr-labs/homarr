"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Checkbox, Group, Stack, Text, Textarea } from "@mantine/core";

import { themeNames } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import type { CustomThemePatch } from "@homarr/validation/theme";
import { MAX_WORKSHOP_CONTENT_LENGTH, validateWorkshopTheme } from "@homarr/workshop/schema";

export type ThemeImportHandler = (
  patch: CustomThemePatch,
  options: { usePreset: boolean; useCss: boolean },
) => string | undefined;

export function ThemeImportForm({
  value,
  onChange,
  onImport,
  onBack,
  backLabel,
}: {
  value: string;
  onChange?(value: string): void;
  onImport: ThemeImportHandler;
  onBack(): void;
  backLabel?: string;
}) {
  const t = useI18n("workshop.theme");
  const common = useI18n("common");
  const [useCss, setUseCss] = useState(false);
  const [usePreset, setUsePreset] = useState(false);
  const [error, setError] = useState<string>();
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const result = useMemo(() => validateWorkshopTheme(value), [value]);
  const patch = result.success ? result.data : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!result.success) {
          setError(result.error);
          return;
        }
        setError(onImport(result.data, { useCss, usePreset }));
      }}
    >
      <Stack gap="sm">
        <Text size="sm">{t("importConfirm")}</Text>
        <Textarea
          ref={input}
          data-autofocus
          name="themeJson"
          label={t("json")}
          value={value}
          readOnly={!onChange}
          required
          maxLength={MAX_WORKSHOP_CONTENT_LENGTH}
          spellCheck={false}
          rows={10}
          onChange={(event) => {
            onChange?.(event.currentTarget.value);
            setUseCss(false);
            setUsePreset(false);
            setError(undefined);
          }}
        />
        {patch?.preset && (
          <Checkbox
            label={t("usePreset", { name: patch.preset === "default" ? t("defaultPreset") : themeNames[patch.preset] })}
            checked={usePreset}
            onChange={(event) => setUsePreset(event.currentTarget.checked)}
          />
        )}
        {patch?.customCss !== undefined && (
          <Checkbox
            label={t("useCss")}
            description={t("cssWarning")}
            checked={useCss}
            onChange={(event) => setUseCss(event.currentTarget.checked)}
          />
        )}
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        <Group justify="space-between">
          <Button type="button" variant="default" onClick={onBack}>
            {backLabel ?? common("action.cancel")}
          </Button>
          <Button type="submit">{t("loadDraft")}</Button>
        </Group>
      </Stack>
    </form>
  );
}
