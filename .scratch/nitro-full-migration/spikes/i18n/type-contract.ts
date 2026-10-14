import { createTranslator } from "use-intl/core";
import type { MessageKeys, NamespaceKeys, NestedKeyOf } from "use-intl/core";

import type english from "../../../../packages/translation/src/lang/en.json";

export type TranslationObjectCandidate = typeof english;
export type TranslationKeysCandidate = MessageKeys<TranslationObjectCandidate, NestedKeyOf<TranslationObjectCandidate>>;
export type TranslationNamespaceCandidate = NamespaceKeys<
  TranslationObjectCandidate,
  NestedKeyOf<TranslationObjectCandidate>
>;

export function createScopedCandidate<Namespace extends TranslationNamespaceCandidate>(
  messages: TranslationObjectCandidate,
  namespace: Namespace,
) {
  return createTranslator({ locale: "en", messages, namespace, timeZone: "UTC" });
}

export function createRootCandidate(messages: TranslationObjectCandidate) {
  return createTranslator({ locale: "en", messages, timeZone: "UTC" });
}

export type TranslationFunctionCandidate = ReturnType<typeof createRootCandidate>;
export type ScopedTranslationFunctionCandidate<Namespace extends TranslationNamespaceCandidate> = ReturnType<
  typeof createScopedCandidate<Namespace>
>;
export type StringOrTranslationCandidate = string | ((t: TranslationFunctionCandidate) => string);

export function createTypedCandidate(messages: TranslationObjectCandidate) {
  const root = createRootCandidate(messages);
  const scoped = createScopedCandidate(messages, "widget.common.app");
  const callback: StringOrTranslationCandidate = (t) =>
    root.has("common.filesystemUsage") ? t("common.filesystemUsage", { count: 2 }) : "";
  return { root, scoped, callback };
}

type Assert<Value extends true> = Value;
export type KnownKey = Assert<"widget.common.app.description" extends TranslationKeysCandidate ? true : false>;
export type UnknownKey = Assert<"not.a.catalog.key" extends TranslationKeysCandidate ? false : true>;
export type KnownNamespace = Assert<"widget.common.app" extends TranslationNamespaceCandidate ? true : false>;
export type UnknownNamespace = Assert<"not.a.namespace" extends TranslationNamespaceCandidate ? false : true>;
