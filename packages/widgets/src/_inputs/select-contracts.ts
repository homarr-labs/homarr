import type { stringOrTranslation } from "@homarr/translation";
import type { TablerIcon } from "@homarr/ui";

export interface DynamicSelectOption {
  value: string;
  label: string;
}

export type SelectOption =
  | {
      icon?: TablerIcon;
      value: string;
      label: stringOrTranslation;
    }
  | string;

export type inferSelectOptionValue<TOption extends SelectOption> = TOption extends {
  value: infer TValue;
}
  ? TValue
  : TOption;
