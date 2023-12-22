import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetSort } from "..";
import type { WidgetOptionsRecordOf } from "../definition";
import type { WidgetOptionOfType, WidgetOptionType } from "../options";

type KeyOf<T> = T extends object ? Exclude<keyof T, number | symbol> : never;

export interface CommonWidgetInputProps<
  TSort extends WidgetSort,
  TKey extends WidgetOptionType,
> {
  sort: TSort;
  property: KeyOf<WidgetOptionsRecordOf<TSort>>;
  options: Omit<WidgetOptionOfType<TKey>, "defaultValue" | "type">;
}

type Input = Parameters<typeof useScopedI18n>[0];
type StrictIt<
  TInput extends Input,
  TSort extends WidgetSort,
> = TInput extends `widget.${TSort}.option.${Exclude<
  keyof WidgetOptionsRecordOf<TSort>,
  symbol
>}`
  ? TInput
  : never;
type StrictWidgetInput<TSort extends WidgetSort> = StrictIt<Input, TSort>;

const translationKeyFor = <TSort extends WidgetSort>(
  sort: TSort,
  property: keyof WidgetOptionsRecordOf<TSort>,
) => `widget.${sort}.option.${property as string}` as StrictWidgetInput<TSort>;

type UseWidgetInputTranslationReturnType = (
  key: "label" | "description",
) => string;

/**
 * Short description why as and unknown convertions are used below:
 * Typescript was not smart enought to work with the generic of the WidgetSort to only allow properties that are relying within that specified sort.
 * This does not mean, that the function useWidgetInputTranslation can be called with invalid arguments without type errors and rather means that the above widget.<sort>.option.<property> string
 * is not recognized as valid argument for the scoped i18n hook. Because the typesafety should remain outside the usage of those methods I (Meierschlumpf) decided to provide this fully typesafe useWidgetInputTranslation method.
 *
 * Some notes about it:
 * - The label translation can be used for every input, especially considering that all options should have defined a label for themself. The description translation should only be used when withDescription
 *   is defined for the option. The method does sadly not reconize issues with those definitions. So it does not yell at you when you somewhere show the label without having it defined in the translations.
 */
export const useWidgetInputTranslation = <TSort extends WidgetSort>(
  sort: TSort,
  property: KeyOf<WidgetOptionsRecordOf<TSort>>,
): UseWidgetInputTranslationReturnType => {
  return useScopedI18n(
    translationKeyFor(sort, property),
  ) as unknown as UseWidgetInputTranslationReturnType;
};
