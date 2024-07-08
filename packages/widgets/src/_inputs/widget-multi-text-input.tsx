import { Combobox, Pill, PillsInput, useCombobox } from "@mantine/core";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import React, { useState } from "react";
import { useFormContext } from "./form";

export const WidgetMultiTextInput = ({ property, kind, options }: CommonWidgetInputProps<"multiText">) => {
  const t = useWidgetInputTranslation(kind, property);
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
  });

  const [search, setSearch] = useState('');

  const form = useFormContext();
  const inputProps = form.getInputProps(`options.${property}`);
  const values = inputProps.value as string[];
  const onChange = inputProps.onChange as (values: string[]) => void;

  const handleRemove = (optionIndex: number) => {
    onChange(values.filter((_, index) => index !== optionIndex));
  }

  const isValidUrl = React.useMemo(() => {
    if (!options.validate) {
      return true;
    }

    const validationResult = options.validate.safeParse(search);
    return validationResult.success;
  }, [search]);

  return (
    <Combobox store={combobox}>
      <Combobox.DropdownTarget>
        <PillsInput
          label={t("label")}
          description={options.withDescription ? t("description") : undefined}
          onClick={() => combobox.openDropdown()}
          /* hide the error when nothing is being typed since "" is not valid but is not an explicit error */
          error={!isValidUrl && search.length !== 0 ? "Provided URL is not valid" : undefined}>
          <Pill.Group>
            {values.map((option, index) => (
              <Pill key={option} onRemove={() => handleRemove(index)} withRemoveButton>{option}</Pill>
            ))}

            <Combobox.EventsTarget>
              <PillsInput.Field
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                value={search}
                placeholder="Add values..."
                onChange={(event) => {
                  combobox.updateSelectedOptionIndex();
                  setSearch(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && search.length === 0) {
                    event.preventDefault();
                    onChange(values.slice(0, -1));
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    if (search.length === 0 || !isValidUrl) {
                      return;
                    }
                    if (values.includes(search)) {
                      return;
                    }
                    onChange([...values, search]);
                    setSearch('');
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>
    </Combobox>
  )
}