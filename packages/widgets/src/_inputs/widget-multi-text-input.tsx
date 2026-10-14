import React, { useEffect, useRef, useState } from "react";
import { Combobox, Pill, PillsInput, useCombobox } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import type { CapturedStaticWidgetInputOwner } from "./static-owner";
import { useStaticWidgetInputOwner } from "./static-owner";

export const WidgetMultiTextInput = ({ property, kind, options }: CommonWidgetInputProps<"multiText">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tCommon = useI18n("common");
  const owner = useStaticWidgetInputOwner(kind, property);
  const edit = useRef<{
    owner: CapturedStaticWidgetInputOwner;
    active: boolean;
    onChange: (values: string[]) => void;
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  } | null>(null);
  const [opened, setOpened] = useState(false);
  const combobox = useCombobox({
    opened: opened && owner.isCurrent() && !!edit.current?.active && edit.current.owner.isCurrent(),
    onOpenedChange: (nextOpened) => {
      if (!owner.isCurrent()) return;
      const operation = edit.current;
      if (!operation?.active || !operation.owner.isCurrent()) return;
      setOpened(nextOpened);
    },
    onDropdownClose: () => {
      const operation = edit.current;
      if (!operation) return;
      if (operation.owner !== owner && !owner.isCurrent()) return;
      if (!operation.owner.isCurrent()) return;
      combobox.resetSelectedOption();
    },
    onDropdownOpen: () => {
      if (!owner.isCurrent()) return;
      const operation = edit.current;
      if (!operation?.active || !operation.owner.isCurrent()) return;
      combobox.updateSelectedOptionIndex("active");
    },
  });

  const [searchState, setSearch] = useState({ owner, value: "" });
  const search = searchState.value;

  const form = useFormContext();
  const fieldPath = `options.${property}`;
  const inputProps = form.getInputProps(fieldPath);
  const readValues = () => {
    const currentValue = form.getValues().options[property];
    if (Array.isArray(currentValue) && currentValue.every((entry: unknown) => typeof entry === "string")) {
      return currentValue;
    }
    return options.defaultValue;
  };
  const values = readValues();
  const originalOnChange = inputProps.onChange;
  const originalOnFocus = inputProps.onFocus;
  const originalOnBlur = inputProps.onBlur;
  const onChange = (origin: CapturedStaticWidgetInputOwner, nextValues: string[]) => {
    if (!origin.isCurrent()) return;
    originalOnChange(nextValues);
  };

  const beginEdit = () => {
    if (!owner.isCurrent()) return;
    const previous = edit.current;
    if (previous?.active && previous.owner.isCurrent()) return;
    edit.current = {
      owner,
      active: true,
      onChange: (nextValues) => onChange(owner, nextValues),
      onBlur: (event) => {
        if (!owner.isCurrent()) return;
        originalOnBlur?.(event);
      },
    };
    let nextSearch = search;
    if (previous && !previous.owner.isCurrent()) nextSearch = "";
    if (!owner.isCurrent()) return;
    setSearch({ owner, value: nextSearch });
  };

  const openDropdown = () => {
    if (!owner.isCurrent()) return;
    beginEdit();
    const operation = edit.current;
    if (!operation?.active || !operation.owner.isCurrent()) return;
    combobox.openDropdown();
  };

  useEffect(
    () => () => {
      if (edit.current) edit.current.active = false;
    },
    [],
  );

  useEffect(() => {
    if (!owner.isCurrent() || Array.isArray(form.getValues().options[property])) return;
    if (!owner.isCurrent()) return;
    form.setFieldValue(fieldPath, options.defaultValue);
  }, [fieldPath, form, inputProps.value, options.defaultValue, owner, property]);

  const handleRemove = (option: string) => {
    if (!owner.isCurrent()) return;
    onChange(
      owner,
      readValues().filter((value) => value !== option),
    );
  };

  const currentValidationResult = React.useMemo(() => {
    if (!options.validate) {
      return {
        success: false,
        result: null,
      };
    }

    const validationResult = options.validate.safeParse(search);
    return {
      success: validationResult.success,
      result: validationResult,
    };
  }, [options.validate, search]);

  const error = React.useMemo(() => {
    if (!currentValidationResult.success && currentValidationResult.result && search.length !== 0) {
      return currentValidationResult.result.error?.issues[0]?.message;
    }
    return null;
  }, [currentValidationResult, search]);

  const handleAddSearch = () => {
    if (!owner.isCurrent()) return;
    const operation = edit.current;
    if (!operation?.active || !operation.owner.isCurrent() || searchState.owner !== operation.owner) return;
    if (search.length === 0 || !currentValidationResult.success) {
      return;
    }
    const currentValues = readValues();
    if (currentValues.includes(search)) {
      return;
    }
    if (!operation.owner.isCurrent()) return;
    operation.onChange([...currentValues, search]);
    if (!operation.owner.isCurrent()) return;
    setSearch({ owner: operation.owner, value: "" });
  };

  return (
    <Combobox store={combobox}>
      <Combobox.DropdownTarget>
        <PillsInput
          label={t("label")}
          description={options.withDescription ? t("description") : undefined}
          onClick={openDropdown}
          error={error}
        >
          <Pill.Group>
            {values.map((option) => (
              <Pill key={option} onRemove={() => handleRemove(option)} withRemoveButton>
                {option}
              </Pill>
            ))}

            <Combobox.EventsTarget>
              <PillsInput.Field
                onFocus={(event) => {
                  if (!owner.isCurrent()) return;
                  openDropdown();
                  if (!owner.isCurrent()) return;
                  originalOnFocus?.(event);
                }}
                onBlur={(event) => {
                  const operation = edit.current;
                  if (!operation?.active) return;
                  if (operation.owner !== owner && !owner.isCurrent()) return;
                  if (!operation.owner.isCurrent()) {
                    operation.active = false;
                    return;
                  }
                  if (!owner.isCurrent()) return;
                  handleAddSearch();
                  if (!operation.owner.isCurrent()) return;
                  operation.onBlur(event);
                  if (!operation.owner.isCurrent()) return;
                  combobox.closeDropdown();
                  operation.active = false;
                }}
                value={search}
                placeholder={tCommon("multiText.placeholder")}
                onChange={(event) => {
                  if (!owner.isCurrent()) return;
                  const operation = edit.current;
                  if (!operation?.active || !operation.owner.isCurrent()) return;
                  const nextSearch = event.currentTarget.value;
                  combobox.updateSelectedOptionIndex();
                  if (!operation.owner.isCurrent()) return;
                  setSearch({ owner: operation.owner, value: nextSearch });
                }}
                onKeyDown={(event) => {
                  if (!owner.isCurrent()) return;
                  const operation = edit.current;
                  if (!operation?.active || !operation.owner.isCurrent()) return;
                  if (event.key === "Backspace" && search.length === 0) {
                    event.preventDefault();
                    if (!operation.owner.isCurrent()) return;
                    operation.onChange(readValues().slice(0, -1));
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddSearch();
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>
    </Combobox>
  );
};
