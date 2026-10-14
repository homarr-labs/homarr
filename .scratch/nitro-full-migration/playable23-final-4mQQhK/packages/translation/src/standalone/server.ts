import { createFormatter, createTranslator } from "use-intl/core";

import { fallbackLocale } from "../languages";

import { isLocaleSupported, loadMessages } from "./catalogs";
import type { I18nErrorHandlers, RequestI18nOptions, TranslationNamespace, TranslationSnapshot } from "./types";

export function createI18n<Namespace extends TranslationNamespace = never>(
  snapshot: TranslationSnapshot,
  namespace?: Namespace,
  handlers: I18nErrorHandlers = {},
) {
  return createTranslator({ ...snapshot, ...handlers, namespace });
}

export function createI18nFormatter(snapshot: TranslationSnapshot, handlers: I18nErrorHandlers = {}) {
  return createFormatter({ ...snapshot, formats: snapshot.formats ?? undefined, onError: handlers.onError });
}

export function createRequestI18n(snapshot: TranslationSnapshot, handlers: I18nErrorHandlers = {}) {
  return {
    snapshot,
    getI18n<Namespace extends TranslationNamespace = never>(namespace?: Namespace) {
      return createI18n(snapshot, namespace, handlers);
    },
    getI18nMessages: () => snapshot.messages,
    getFormatter: () => createI18nFormatter(snapshot, handlers),
  };
}

export async function loadRequestI18n(options: RequestI18nOptions) {
  const { locale: requestedLocale, onError, getMessageFallback, ...configuration } = options;
  const locale = requestedLocale && isLocaleSupported(requestedLocale) ? requestedLocale : fallbackLocale;
  const messages = await loadMessages(locale);
  const snapshot: TranslationSnapshot = Object.freeze({ locale, messages, ...configuration });
  return createRequestI18n(snapshot, { onError, getMessageFallback });
}
