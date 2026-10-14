import { useLayoutEffect, useRef, useState } from "react";

import { useI18n } from "../../../../../packages/translation/src/standalone/client";
import { zodErrorMap } from "../../../../../packages/validation/src/form/i18n";
import type { userPreferencesSchema } from "../../../../../packages/validation/src/user";

import type { SettingsSaveResult } from "./data";
import type { SettingsAccess, SettingsFeatureClient } from "./client";

export type SettingsDraftStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "pending" }
  | { readonly kind: "saved" }
  | { readonly kind: "error"; readonly errors: readonly unknown[] };

type SettingsValidationIssue = Extract<
  ReturnType<typeof userPreferencesSchema.safeParse>,
  { success: false }
>["error"]["issues"][number];

interface SettingsValidationSchema<Values> {
  safeParse(
    input: unknown,
  ):
    | { readonly success: true; readonly data: Values }
    | { readonly success: false; readonly error: { readonly issues: readonly SettingsValidationIssue[] } };
}

interface SettingsDraftFlow<Snapshot> {
  readonly cacheScope: string;
  readonly client: SettingsFeatureClient;
  readonly targetId: string;
  readonly access: SettingsAccess["kind"];
  readonly onSaved?: (snapshot: Snapshot) => void | Promise<void>;
}

interface SettingsFlowGeneration {
  readonly generation: number;
  readonly cacheScope: string;
  readonly client: SettingsFeatureClient;
  readonly targetId: string;
  readonly access: SettingsAccess["kind"];
  mounted: boolean;
}

interface SettingsDraftState<Values> {
  readonly values: Values;
  readonly baseline: Values;
  readonly incomingRevision: string | undefined;
  readonly status: SettingsDraftStatus;
}

export function useSettingsDraft<Values, Snapshot = unknown>(
  initialValues: Values,
  schema: SettingsValidationSchema<Values>,
  save: (values: Values, baseline: Values) => Promise<SettingsSaveResult<Values, Snapshot>>,
  flow: SettingsDraftFlow<Snapshot>,
) {
  const t = useI18n();
  const incomingRevision = JSON.stringify(initialValues);
  const [draft, setDraft] = useState<SettingsDraftState<Values>>(() => ({
    values: initialValues,
    baseline: initialValues,
    incomingRevision,
    status: { kind: "idle" },
  }));
  const submitting = useRef(false);
  const generation = useRef(0);
  const currentFlow = useRef<SettingsFlowGeneration | null>(null);
  const onSaved = useRef(flow.onSaved);
  useLayoutEffect(() => {
    onSaved.current = flow.onSaved;
  }, [flow.onSaved]);
  useLayoutEffect(() => {
    const active = {
      generation: ++generation.current,
      cacheScope: flow.cacheScope,
      client: flow.client,
      targetId: flow.targetId,
      access: flow.access,
      mounted: true,
    };
    currentFlow.current = active;
    submitting.current = false;
    setDraft((current) => (current.status.kind === "pending" ? { ...current, status: { kind: "idle" } } : current));
    return () => {
      active.mounted = false;
    };
  }, [flow.cacheScope, flow.client, flow.targetId, flow.access]);
  const { values, baseline, status } = draft;
  const parsed = schema.safeParse(values);
  const localizeError = zodErrorMap(t);
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  if (draft.incomingRevision !== incomingRevision) {
    setDraft((current) => {
      if (current.incomingRevision === incomingRevision) return current;
      if (submitting.current || JSON.stringify(current.values) !== JSON.stringify(current.baseline)) {
        return { ...current, incomingRevision };
      }
      if (incomingRevision === JSON.stringify(current.baseline)) return { ...current, incomingRevision };
      return { values: initialValues, baseline: initialValues, incomingRevision, status: { kind: "idle" } };
    });
  }
  const change = <Key extends keyof Values>(key: Key, value: Values[Key]) => {
    if (submitting.current) return;
    setDraft((current) => ({ ...current, values: { ...current.values, [key]: value }, status: { kind: "idle" } }));
  };
  return {
    values,
    status,
    dirty,
    valid: parsed.success,
    error(path: string) {
      if (parsed.success) return undefined;
      const issue = parsed.error.issues.find((candidate) => candidate.path.join(".") === path);
      if (!issue) return undefined;
      let input: unknown = values;
      for (const part of issue.path)
        input = input !== null && typeof input === "object" ? Reflect.get(input, part) : undefined;
      const localized = localizeError(
        issue.code === "invalid_type" ? { ...issue, input } : { ...issue, input: undefined },
      );
      return typeof localized === "string" ? localized : (localized?.message ?? issue.message);
    },
    change,
    discard() {
      if (submitting.current) return;
      setDraft((current) => ({ ...current, values: current.baseline, status: { kind: "idle" } }));
    },
    async submit() {
      if (submitting.current || !dirty || !parsed.success) return;
      const active = currentFlow.current;
      if (
        !active?.mounted ||
        active.access !== "editable" ||
        active.cacheScope !== flow.cacheScope ||
        active.client !== flow.client ||
        active.targetId !== flow.targetId ||
        active.access !== flow.access
      )
        return;
      const isCurrent = () => active.mounted && currentFlow.current?.generation === active.generation;
      submitting.current = true;
      setDraft((current) => ({ ...current, status: { kind: "pending" } }));
      try {
        const result = await save(parsed.data, baseline);
        if (!isCurrent()) return;
        if (result.snapshot !== undefined) await onSaved.current?.(result.snapshot);
        if (!isCurrent()) return;
        setDraft((current) => ({
          ...current,
          baseline: result.value,
          values: result.errors.length > 0 ? (result.draftValue ?? current.values) : result.value,
          status: result.errors.length > 0 ? { kind: "error", errors: result.errors } : { kind: "saved" },
        }));
      } catch (error: unknown) {
        if (isCurrent()) setDraft((current) => ({ ...current, status: { kind: "error", errors: [error] } }));
      } finally {
        if (isCurrent()) submitting.current = false;
      }
    },
  };
}

export type SettingsDraft<Values> = ReturnType<typeof useSettingsDraft<Values>>;
