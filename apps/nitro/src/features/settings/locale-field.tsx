import { Alert, Select, Stack } from "@mantine/core";
import { useRef, useState } from "react";

import { useI18n } from "../../../../../packages/translation/src/standalone/client";
import type { LocaleChange } from "../../../../../packages/translation/src/standalone/client";
import type { SupportedLanguage } from "../../../../../packages/translation/src/languages";
import { extractErrorMessage } from "../../../../../packages/common/src/error";

import type { SettingsAccess } from "./client";
import { settingsLanguageOptions } from "./culture";

export function LocalePreferenceField({
  locale,
  onChangeLocale,
  access,
}: {
  readonly locale: SupportedLanguage;
  readonly onChangeLocale: LocaleChange;
  readonly access: SettingsAccess;
}) {
  const t = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const submitting = useRef(false);
  const change = async (next: SupportedLanguage | null) => {
    if (next === null || next === locale || submitting.current || access.kind !== "editable") return;
    submitting.current = true;
    setPending(true);
    setError(undefined);
    try {
      await onChangeLocale(next);
    } catch (failure: unknown) {
      setError(failure);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  return (
    <Stack gap="xs">
      <Select<SupportedLanguage>
        label={t("management.page.settings.section.culture.defaultLocale.label")}
        data={[...settingsLanguageOptions]}
        value={locale}
        allowDeselect={false}
        searchable
        nothingFoundMessage={t("common.noResults")}
        disabled={pending || access.kind !== "editable"}
        aria-busy={pending}
        onChange={(next) => void change(next)}
      />
      {error !== undefined && (
        <Alert color="red" role="alert" title={t("common.notification.update.error")}>
          {error instanceof Error || typeof error === "string"
            ? extractErrorMessage(error)
            : t("common.notification.update.error")}
        </Alert>
      )}
    </Stack>
  );
}
