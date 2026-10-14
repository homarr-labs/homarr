"use client";

import { useLayoutEffect, useState } from "react";
import dayjs from "dayjs";

import { localeConfigurations } from "../config";
import type { SupportedLanguage } from "../languages";

type LocaleLoadState =
  | { status: "pending"; promise: Promise<void> }
  | { status: "loaded"; locale: ILocale }
  | { status: "failed" };

export type DayJsLocalizationResult =
  | { status: "awaiting-commit"; requestedLocale: SupportedLanguage }
  | { status: "ready"; requestedLocale: SupportedLanguage; selectedLocale: string }
  | { status: "failed-retained-default"; requestedLocale: SupportedLanguage; selectedLocale: string };

type BrowserLocaleOwner = { token: symbol };
type SettledLocalizationResult = Exclude<DayJsLocalizationResult, { status: "awaiting-commit" }>;
type CommittedSelection = {
  owner: BrowserLocaleOwner;
  resource: LocaleLoadState;
  result: SettledLocalizationResult;
};

const documentResources = new WeakMap<Document, Map<SupportedLanguage, LocaleLoadState>>();
let browserOwner: BrowserLocaleOwner | null = null;

export function useSuspenseDayJsLocalization(locale: SupportedLanguage): DayJsLocalizationResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error(
      "Day.js default locale localization requires a browser owner; SSR date localization is not supported",
    );
  }

  let resources = documentResources.get(document);
  if (!resources) {
    resources = new Map<SupportedLanguage, LocaleLoadState>();
    documentResources.set(document, resources);
  }

  let state = resources.get(locale);
  if (!state) {
    const localeResources = resources;
    const promise = localeConfigurations[locale]
      .importDayJsLocale()
      .then((dayJsLocale) => {
        localeResources.set(locale, { status: "loaded", locale: dayJsLocale });
      })
      .catch(() => {
        localeResources.set(locale, { status: "failed" });
      });
    state = { status: "pending", promise };
    resources.set(locale, state);
  }

  const resource = state;
  const [token] = useState(() => Symbol());
  const [selection, setSelection] = useState<CommittedSelection | null>(null);

  useLayoutEffect(() => {
    if (resource.status === "pending") return;
    if (browserOwner && browserOwner.token !== token) {
      throw new Error("Day.js default locale localization requires one canonical mounted browser owner");
    }

    const owner = { token };
    let result: SettledLocalizationResult;
    if (resource.status === "loaded") {
      result = { status: "ready", requestedLocale: locale, selectedLocale: dayjs.locale(resource.locale) };
    } else {
      result = { status: "failed-retained-default", requestedLocale: locale, selectedLocale: dayjs.locale() };
    }
    browserOwner = owner;
    setSelection({ owner, resource, result });

    return () => {
      if (browserOwner === owner) browserOwner = null;
    };
  }, [locale, resource, token]);

  if (resource.status === "pending") throw resource.promise;
  if (
    selection?.result.requestedLocale === locale &&
    selection.resource === resource &&
    browserOwner === selection.owner
  ) {
    return selection.result;
  }
  return { status: "awaiting-commit", requestedLocale: locale };
}
