import type { ReactNode } from "react";
import { Alert, Box, Fieldset, Stack, Text } from "@mantine/core";

import type {
  EditorOption,
  EditorTranslate,
  SpecializedOptionProps,
  WidgetEditorBindings,
  WidgetEditorDomain,
  WidgetEditorChangeOwner,
} from "./contracts";
import { CustomWidgetConfiguration } from "./custom-widget-configuration";
import { ReleaseRepositories } from "./release-repositories";
import { isSharedOption, isSharedOptionHeld, SharedWidgetOption, supportsSharedOption } from "./shared-controls";

export function supportsLocalOption(type: EditorOption["type"]) {
  return (
    (supportsSharedOption(type) && !isSharedOptionHeld(type)) ||
    ["customWidgetSelect", "customWidgetConfiguration", "multiReleasesRepositories"].includes(type)
  );
}

type WidgetOptionFieldProps = SpecializedOptionProps & {
  domain: WidgetEditorDomain;
  bindings: WidgetEditorBindings;
  t: EditorTranslate;
  byteUnitSystem: "binary" | "decimal";
  validationErrors: Readonly<Record<string, ReactNode>>;
  inputOwner: WidgetEditorChangeOwner;
};

export function WidgetEditorFieldErrors(props: { path: string; errors: Readonly<Record<string, ReactNode>> }) {
  return Object.entries(props.errors)
    .filter(([path]) => path === props.path || path.startsWith(`${props.path}.`))
    .map(([path, error]) => (
      <Box key={path} role="alert" c="red">
        {error}
      </Box>
    ));
}

export function WidgetOptionField(props: WidgetOptionFieldProps) {
  return (
    <>
      <WidgetOptionControl {...props} />
      <WidgetEditorFieldErrors path={`options.${props.property}`} errors={props.validationErrors} />
    </>
  );
}

function WidgetOptionControl(props: WidgetOptionFieldProps) {
  const { option, domain, t } = props;
  if (isSharedOptionHeld(option.type)) {
    const namespace = domain.getWidgetOptionTranslationNamespace(props.kind, props.property);
    return (
      <Alert color="yellow" title={t(`${namespace}.label`)}>
        <Text size="sm">{t("nitro.widgetEditor.specializedOptionUnavailable", { type: option.type })}</Text>
      </Alert>
    );
  }
  if (option.type === "multiReleasesRepositories") return <ReleaseRepositories {...props} />;
  if (option.type === "customWidgetSelect" || option.type === "customWidgetConfiguration")
    return <CustomWidgetConfiguration {...props} />;
  if (isSharedOption(option)) {
    return (
      <Fieldset
        variant="unstyled"
        p={0}
        m={0}
        disabled={props.disabled || !props.inputOwner.isCurrent()}
        inert={props.disabled || !props.inputOwner.isCurrent()}
      >
        <SharedWidgetOption
          property={props.property}
          kind={props.kind}
          initialOptions={props.initialOptions}
          itemId={props.itemId}
          boardId={props.boardId}
          option={option}
        />
      </Fieldset>
    );
  }
  const SpecializedOption = props.bindings.SpecializedOption;
  if (SpecializedOption && props.bindings.supportsSpecializedOption?.(option.type))
    return <SpecializedOption {...props} />;
  const namespace = domain.getWidgetOptionTranslationNamespace(props.kind, props.property);
  return (
    <Alert color="yellow" title={t(`${namespace}.label`)}>
      <Stack gap={4}>
        <Text size="sm">{t("nitro.widgetEditor.specializedOptionUnavailable", { type: option.type })}</Text>
        {props.error && <Text size="sm">{props.error}</Text>}
      </Stack>
    </Alert>
  );
}
