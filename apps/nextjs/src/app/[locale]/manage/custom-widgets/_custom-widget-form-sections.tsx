import type { RefObject } from "react";
import {
  Button,
  Fieldset,
  Group,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import { IconCode, IconLayoutGrid, IconPlayerPlay } from "@tabler/icons-react";
import { IconPicker } from "@homarr/forms-collection";
import { CUSTOM_JSX_STARTER } from "@homarr/custom-widgets/core";
import {
  CUSTOM_WIDGET_AUTH_SECRET_FIELDS,
  CUSTOM_WIDGET_AUTH_USES_HEADER_NAME,
} from "@homarr/custom-widgets/workbench";

import type { DisplayFieldsProps } from "./_display-field-types";
import { DISPLAY_TYPE_ICONS, DisplayTypeFields, DisplayTypePicker } from "./_display-type-fields";
import classes from "./_custom-widget-form.module.css";

interface SharedSectionProps extends DisplayFieldsProps {
  sectionRef: RefObject<HTMLElement | null>;
}

interface FormatSectionProps extends SharedSectionProps {
  onContinue: () => void;
}

export function FormatSection({ form, t, sectionRef, onContinue }: FormatSectionProps) {
  return (
    <section ref={sectionRef} className={classes.formSection} tabIndex={-1}>
      <ThemeIcon className={classes.sectionMarker} variant="filled" size={40} radius="xl">
        <IconLayoutGrid size={20} />
      </ThemeIcon>
      <Stack gap="xl">
        <SectionHeading label={t("steps.format.label")} description={t("steps.format.description")} />
        <Fieldset legend={t("fieldset.general")}>
          <Stack gap="sm">
            <TextInput label={t("field.name")} required {...form.getInputProps("name")} />
            <Textarea label={t("field.description")} {...form.getInputProps("description")} />
            <IconPicker withAsterisk={false} {...form.getInputProps("iconUrl")} />
          </Stack>
        </Fieldset>
        <Fieldset legend={t("field.displayType")}>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              {t("steps.format.help")}
            </Text>
            <DisplayTypePicker
              value={form.values.displayType}
              onChange={(value) => {
                form.setFieldValue("displayType", value);
                if (value === "customJsx" && !form.values.template.trim())
                  form.setFieldValue("template", CUSTOM_JSX_STARTER);
              }}
              t={t}
            />
          </Stack>
        </Fieldset>
        <ContinueButton label={t("steps.continueTo", { step: t("steps.connection.label") })} onClick={onContinue} />
      </Stack>
    </section>
  );
}

interface ConnectionSectionProps extends SharedSectionProps {
  isTesting: boolean;
  onTest: () => void;
  onContinue: () => void;
}

export function ConnectionSection({ form, t, sectionRef, isTesting, onTest, onContinue }: ConnectionSectionProps) {
  const secretFields = CUSTOM_WIDGET_AUTH_SECRET_FIELDS[form.values.authType] ?? [];
  const authTypeOptions = ["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"].map((value) => ({
    value,
    label: t(`authType.${value}` as never),
  }));
  const handleAuthTypeChange = (value: string) => {
    form.setFieldValue("authType", value);
    form.setFieldValue(
      "secrets",
      (CUSTOM_WIDGET_AUTH_SECRET_FIELDS[value] ?? []).map((field) => ({
        kind: field.kind,
        value: form.values.secrets.find((secret) => secret.kind === field.kind)?.value ?? "",
      })),
    );
  };
  return (
    <section ref={sectionRef} className={classes.formSection} tabIndex={-1}>
      <ThemeIcon className={classes.sectionMarker} variant="light" size={40} radius="xl">
        <IconPlayerPlay size={20} />
      </ThemeIcon>
      <Stack gap="xl">
        <SectionHeading label={t("steps.connection.label")} description={t("steps.connection.description")} />
        <Fieldset legend={t("fieldset.connection")}>
          <Stack gap="sm">
            <Group align="end" wrap="wrap" gap="xs">
              <Select
                label={t("field.method")}
                data={["GET", "POST", "PUT", "DELETE", "PATCH"].map((value) => ({
                  value,
                  label: t(`method.${value}` as never),
                }))}
                w={110}
                {...form.getInputProps("method")}
                allowDeselect={false}
                disabled={form.values.displayType === "customJsx" && form.values.jsxApiVersion === "2"}
              />
              <TextInput
                label={t("field.url")}
                required
                placeholder={t("placeholder.url")}
                style={{ flex: "1 1 260px" }}
                {...form.getInputProps("url")}
              />
              <Button
                type="button"
                size="sm"
                variant="light"
                leftSection={<IconPlayerPlay size={16} />}
                onClick={onTest}
                loading={isTesting}
                disabled={!form.values.url || form.values.method !== "GET"}
              >
                {t("preview.test")}
              </Button>
            </Group>
            <div>
              <Text size="sm" fw={500} mb={4}>
                {t("field.authType")}
              </Text>
              <Select
                hiddenFrom="sm"
                value={form.values.authType}
                data={authTypeOptions}
                onChange={(value) => handleAuthTypeChange(value ?? "none")}
                allowDeselect={false}
                aria-label={t("field.authType")}
              />
              <SegmentedControl
                visibleFrom="sm"
                fullWidth
                value={form.values.authType}
                data={authTypeOptions}
                onChange={handleAuthTypeChange}
              />
            </div>
            {CUSTOM_WIDGET_AUTH_USES_HEADER_NAME[form.values.authType] && (
              <TextInput
                label={t("field.headerName")}
                placeholder={t("placeholder.headerName")}
                {...form.getInputProps("headerName")}
              />
            )}
            {secretFields.map((field) => {
              const index = form.values.secrets.findIndex((secret) => secret.kind === field.kind);
              const secret = form.values.secrets[index];
              if (index === -1 || !secret) return null;
              const props = {
                label: t(`secret.${field.labelKey}` as never),
                placeholder: secret.hasValue && !secret.value ? t("secret.savedPlaceholder" as never) : undefined,
                ...form.getInputProps(`secrets.${index}.value`),
              };
              return field.isPassword ? (
                <PasswordInput key={field.kind} {...props} />
              ) : (
                <TextInput key={field.kind} {...props} />
              );
            })}
            {form.values.method !== "GET" && (
              <Textarea label={t("field.requestBody")} minRows={3} {...form.getInputProps("requestBody")} />
            )}
          </Stack>
        </Fieldset>
        <ContinueButton label={t("steps.continueTo", { step: t("steps.configure.label") })} onClick={onContinue} />
      </Stack>
    </section>
  );
}

export function ConfigureSection({ form, t, previewJson, sectionRef }: SharedSectionProps) {
  const SelectedIcon = DISPLAY_TYPE_ICONS[form.values.displayType as keyof typeof DISPLAY_TYPE_ICONS];
  return (
    <section ref={sectionRef} className={classes.formSection} tabIndex={-1}>
      <ThemeIcon className={classes.sectionMarker} variant="light" size={40} radius="xl">
        <IconCode size={20} />
      </ThemeIcon>
      <Stack gap="xl">
        <SectionHeading label={t("steps.configure.label")} description={t("steps.configure.description")} />
        <Fieldset legend={t("fieldset.display")}>
          <Stack gap="sm">
            <Group gap="xs">
              <ThemeIcon variant="light" size="lg">
                {SelectedIcon ? <SelectedIcon size={20} /> : null}
              </ThemeIcon>
              <div>
                <Text fw={600}>{t(`displayType.${form.values.displayType}` as never)}</Text>
                <Text size="xs" c="dimmed">
                  {t(`displayTypeDescription.${form.values.displayType}` as never)}
                </Text>
              </div>
            </Group>
            <DisplayTypeFields form={form} t={t} previewJson={previewJson} />
          </Stack>
        </Fieldset>
      </Stack>
    </section>
  );
}

function SectionHeading({ label, description }: { label: string; description: string }) {
  return (
    <div>
      <Text fw={700} size="lg">
        {label}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </div>
  );
}

function ContinueButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Group justify="flex-end">
      <Button type="button" variant="light" size="md" onClick={onClick}>
        {label}
      </Button>
    </Group>
  );
}
