# P2 original delegation: frozen for independent review

## Exact lease and result

This fresh original-delegation lease follows the accepted UI publication gate reported by reviewer `ses_ed4f3f694ffeWPdJGaWNEpppHg`. It supersedes no prior source-view history and does not reopen any UI leaf lease. Read the three actual original sources and `implementation/source-presentation-P2.md` before edits; also read the now-public contracts, leaves, index and manifest without changing them.

Only these files were written:

- `apps/nextjs/src/app/[locale]/manage/users/create/_components/stepper-navigation.tsx`
- `apps/nextjs/src/app/[locale]/manage/users/groups/[id]/_reserved-group-alert.tsx`
- `apps/nextjs/src/app/[locale]/manage/settings/_components/setting-switch.tsx`
- `.scratch/nitro-full-migration/implementation/source-presentation-P2-delegation.md`

The handoff path was absent before writing. The three originals now delegate their render bodies to the actual public `StepperNavigationView`, `ReservedGroupAlertView` and `SettingSwitchView` from `@homarr/ui/source-views/identity-settings`. No alternative layout, helper, source leaf, stylesheet, controller, native binding, barrel, dependency or manifest was created or edited. Public UI leaves/contracts/index and package exports remain frozen. The previous source-presentation handoff remains untouched historical evidence; its pre-publication status is superseded only by the fresh explicit publication/delegation authorization.

## Before and after source identity

SHA-256 was captured directly from the three exact files before editing and again after patching and rereading. This was static byte hashing, not lint, typecheck, build, import evaluation or runtime validation. The retained pre-edit source bodies below include their imports, signatures and business bindings. The current three source files are the frozen after bodies identified by these hashes.

| Original file                                                                         | Before SHA-256                                                     | After SHA-256                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `apps/nextjs/src/app/[locale]/manage/users/create/_components/stepper-navigation.tsx` | `016f5dfe4610fadad639248ed497b7ee5191bcb97b09b1a9ee6fe80a40de7523` | `1aaed8c31e22e67c40104c96401d58097cd237220f4d1631e68ae2066ae6b75c` |
| `apps/nextjs/src/app/[locale]/manage/users/groups/[id]/_reserved-group-alert.tsx`     | `a95e731d2e0d14722a0568dc0547a49cc55be0818751087d8edd99d8d9fb6934` | `90d5bcbc57c9809ea9cbb42ab5ca550b327dc419c805c6a934c4c1d783f8fe30` |
| `apps/nextjs/src/app/[locale]/manage/settings/_components/setting-switch.tsx`         | `0691b33a9c5cafc638ecd4645ddc7899b3cdfdfef06ea3b17afef5e858f5d3b6` | `164308577354ea214545f6d37d83e3efee4ed6836d81f337823c150177e91780` |

## Nonrender and source contract preservation

### Stepper

`StepperNavigationComponent` remains the same named export with its unchanged `StepperNavigationComponentProps`, destructuring, booleans and `prevStep`/`nextStep`/`reset` callbacks. The original `useI18n("common")` and `useI18n("management.page.user.create")` acquisitions remain in the wrapper. It passes the exact `action.previous`, `action.next`, `action.createAnother` and `action.back` translations, the exact `/manage/users` href and the original real `Link` component.

The published view owns the original Card, incomplete/completed groups, no-wrap spacing, arrow icons, disabled previous/next rules and next loading indicator. It retains the light reset button separately from the real return link; no return callback, pending override or extra completion gate was introduced. Labels are now supplied together as required by the accepted presentation contract; their namespaces and keys are unchanged and no translated English was hardcoded.

### Reserved notice

`ReservedGroupAlert` remains a client component with the same named export and no props. `useI18n("group")`, `useI18n("common")` and `createDocumentationLink` stay in this wrapper. The exact `reservedNotice.message` rich call maps `checkoutDocs` to the actual documentation Anchor supplied by the published view. The exact `action.checkoutDocs` label and `createDocumentationLink("/docs/management/users", "#special-groups")` expression remain unchanged outside the pure UI leaf. The accepted view takes the resolved href, so URL resolution is evaluated during wrapper render rather than inside the former rich-link callback; no helper, host override or URL policy was changed.

The published view owns the original light/yellow Alert, stroke-1.5 icon and size-sm Anchor with `target="_blank"`. Rich link placement stays with the original localized message, not a plain-string prefix/suffix replacement.

### Switch

`SwitchSetting` retains its exact named generic export, `TFormValue extends Record<string, unknown>`, `BooleanKeys<TFormValue>`, `UseFormReturnType<TFormValue, TFormValue>`, `formKey: string & BooleanKeys<TFormValue>`, ReactNode text, MantineSpacing ms and optional disabled prop. The entire original generic/signature/callback region, original lines 8–33, remains unchanged. `React.useCallback`, its disabled guard, `form.setFieldValue(formKey, (previous) => !previous as never)` and `[form, formKey, disabled]` dependencies remain in the original wrapper. The existing legacy `as never` assertion was retained verbatim as part of the expressly frozen form binding; no new assertion, cast or type erasure was added.

The wrapper passes `checked={Boolean(form.values[formKey])}`, ms, title, text, current disabled and `onToggle={handleClick}` directly. The actual source view retains the original title button and Switch input click targets and invokes onToggle once for either enabled click. Its presentation guard and the unchanged wrapper guard do not add another mutation. No new onChange handler, event proxy, local checked state, form binding abstraction or native title-button disabled attribute was introduced. The original spacing, gray text, responsive sizing and title/control tree now have one published render source.

### Real source Link boundary

Both link slots receive the original imported `Link` itself, not a wrapper, native-anchor substitute or erased type. Safe reads showed that `IdentitySettingsLinkProps` and `NavigationLinkProps` share `Omit<ComponentPropsWithRef<"a">, "href">` plus required string href; the latter only adds optional replace/scroll/prefetch. Thus this direct binding is structurally compatible on source inspection without casts. `Link` still acquires the existing navigation adapter and forwards all props, including events and ref, to its RoutedLink. Mantine Button/Anchor still supply their root props through the actual component slot. Nothing in the navigation provider or its lifetime was changed or executed; this source-slot proof is not native provider acceptance or browser evidence.

## Retained pre-edit source bytes

Each plain-text fenced body is the complete pre-edit UTF-8/LF source, with a terminal newline before its closing fence. Plain-text fences retain exact source formatting instead of allowing automatic Markdown code-fence formatting. Paths and original line counts are recorded separately from the body.

### `apps/nextjs/src/app/[locale]/manage/users/create/_components/stepper-navigation.tsx` (60 lines)

```text
import { Button, Card, Group } from "@mantine/core";
import { IconArrowBackUp, IconArrowLeft, IconArrowRight, IconRotate } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

interface StepperNavigationComponentProps {
  hasPrevious: boolean;
  hasNext: boolean;
  isComplete: boolean;
  isLoadingNextStep: boolean;
  prevStep: () => void;
  nextStep: () => void;
  reset: () => void;
}

export const StepperNavigationComponent = ({
  hasNext,
  hasPrevious,
  isComplete,
  isLoadingNextStep,
  nextStep,
  prevStep,
  reset,
}: StepperNavigationComponentProps) => {
  const tCommon = useI18n("common");
  const tCreate = useI18n("management.page.user.create");
  return (
    <Card>
      {!isComplete ? (
        <Group justify="space-between" wrap="nowrap">
          <Button
            leftSection={<IconArrowLeft size="1rem" />}
            disabled={!hasPrevious || isLoadingNextStep}
            onClick={prevStep}
          >
            {tCommon("action.previous")}
          </Button>
          <Button
            rightSection={<IconArrowRight size="1rem" />}
            disabled={!hasNext || isLoadingNextStep}
            loading={isLoadingNextStep}
            onClick={nextStep}
          >
            {tCommon("action.next")}
          </Button>
        </Group>
      ) : (
        <Group justify="end" wrap="nowrap">
          <Button variant="light" leftSection={<IconRotate size="1rem" />} onClick={reset}>
            {tCreate("action.createAnother")}
          </Button>
          <Button leftSection={<IconArrowBackUp size="1rem" />} component={Link} href="/manage/users">
            {tCreate("action.back")}
          </Button>
        </Group>
      )}
    </Card>
  );
};
```

### `apps/nextjs/src/app/[locale]/manage/users/groups/[id]/_reserved-group-alert.tsx` (30 lines)

```text
"use client";

import { Alert, Anchor } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import { createDocumentationLink } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

export const ReservedGroupAlert = () => {
  const tGroup = useI18n("group");
  const tCommon = useI18n("common");

  return (
    <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
      {tGroup.rich("reservedNotice.message", {
        checkoutDocs: () => (
          <Anchor
            size="sm"
            component={Link}
            href={createDocumentationLink("/docs/management/users", "#special-groups")}
            target="_blank"
          >
            {tCommon("action.checkoutDocs")}
          </Anchor>
        ),
      })}
    </Alert>
  );
};
```

### `apps/nextjs/src/app/[locale]/manage/settings/_components/setting-switch.tsx` (48 lines)

```text
import type { ReactNode } from "react";
import React from "react";
import type { MantineSpacing } from "@mantine/core";
import { Group, Stack, Switch, Text, UnstyledButton } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";

type BooleanKeys<TFormValue> = {
  [TKey in keyof TFormValue]: TFormValue[TKey] extends boolean ? TKey : never;
}[keyof TFormValue];

export const SwitchSetting = <TFormValue extends Record<string, unknown>>({
  form,
  ms,
  title,
  text,
  formKey,
  disabled,
}: {
  form: UseFormReturnType<TFormValue, TFormValue>;
  formKey: string & BooleanKeys<TFormValue>;
  ms?: MantineSpacing;
  title: string;
  text: ReactNode;
  disabled?: boolean;
}) => {
  const handleClick = React.useCallback(() => {
    if (disabled) {
      return;
    }

    form.setFieldValue(formKey, (previous) => !previous as never);
  }, [form, formKey, disabled]);

  return (
    <Group ms={ms} justify="space-between" gap="lg" align="center" wrap="nowrap">
      <UnstyledButton style={{ flexGrow: 1 }} onClick={handleClick}>
        <Stack gap={0}>
          <Text fw="bold">{title}</Text>
          <Text c="gray.5" fz={{ base: "xs", md: "sm" }}>
            {text}
          </Text>
        </Stack>
      </UnstyledButton>
      <Switch disabled={disabled} onClick={handleClick} checked={Boolean(form.values[formKey])} />
    </Group>
  );
};
```

## Verification and remaining holds

Dedicated source reads, absence discovery, static SHA-256 captures, exact-file patches and manual after-source rereads are the only evidence. No checks, lint, typecheck, build, install, tests, import evaluation, network/provider/SQL, browser, environment/credentials/data access, listeners, Git mutation or nested agents ran. No new comments, tests, any types, assertions or ternary logic were introduced. No executable or independent delegation acceptance is claimed.

The three original controls now reuse one published presentation body each. This is not a mounted Nitro frontend, full Identity/Settings parity, native authority/grant/resource settlement, or Q16–Q18 execution proof. Rich forms, HeaderComposer drag-and-drop, native identity/settings writes and canonical durable settings ownership remain outside these three render delegations. Independent review of this exact frozen delegation delta remains required.
