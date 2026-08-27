"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Collapse,
  Fieldset,
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconClick, IconListSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { formatLocalizedCompactNumber } from "../common/locale";
import type { OptionLocation } from "../options";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

export const WidgetLocationInput = ({ property, kind, options }: CommonWidgetInputProps<"location">) => {
  const t = useWidgetInputTranslation(kind, property);
  const tLocation = useI18n("widget.common.location");
  const form = useFormContext();
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const fieldPath = `options.${property}`;
  const inputProps = form.getInputProps(fieldPath);
  const value = isOptionLocation(inputProps.value) ? inputProps.value : options.defaultValue;
  const nameInputProps = form.getInputProps(`options.${property}.name`);
  const latitudeInputProps = form.getInputProps(`options.${property}.latitude`);
  const longitudeInputProps = form.getInputProps(`options.${property}.longitude`);
  const selectionEnabled = value.name.length > 1;
  const initializedFieldPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializedFieldPathRef.current === fieldPath) return;
    initializedFieldPathRef.current = fieldPath;
    if (isOptionLocation(inputProps.value)) return;
    form.setFieldValue(fieldPath, options.defaultValue);
  }, [fieldPath, form, inputProps.value, options.defaultValue]);

  const handleChange = inputProps.onChange as LocationOnChange;
  const unknownLocation = tLocation("unknownLocation");

  const onLocationSelect = useCallback(
    (location: OptionLocation) => {
      handleChange(location);
      form.clearFieldError(`options.${property}.latitude`);
      form.clearFieldError(`options.${property}.longitude`);
      setSearchQuery(null);
    },
    [form, handleChange, property],
  );

  const onSearch = useCallback(() => {
    if (!selectionEnabled) return;
    setSearchQuery(value.name);
  }, [selectionEnabled, value.name]);

  form.watch(`options.${property}.latitude`, ({ value: nextValue }) => {
    if (typeof nextValue !== "number") return;
    form.setFieldValue(`options.${property}.name`, unknownLocation);
  });

  form.watch(`options.${property}.longitude`, ({ value: nextValue }) => {
    if (typeof nextValue !== "number") return;
    form.setFieldValue(`options.${property}.name`, unknownLocation);
  });

  return (
    <Fieldset legend={t("label")}>
      <Stack gap="xs">
        <Group wrap="nowrap" align="end">
          <TextInput
            w="100%"
            label={tLocation("query")}
            {...nameInputProps}
            value={nameInputProps.value ?? value.name}
          />
          <Tooltip hidden={selectionEnabled} label={tLocation("disabledTooltip")}>
            <div>
              <Button
                disabled={!selectionEnabled}
                onClick={onSearch}
                variant="light"
                leftSection={<IconListSearch size="var(--mantine-font-size-md)" />}
              >
                {tLocation("search")}
              </Button>
            </div>
          </Tooltip>
        </Group>

        <Group grow>
          <NumberInput
            decimalScale={5}
            label={tLocation("latitude")}
            hideControls
            {...latitudeInputProps}
            value={latitudeInputProps.value ?? value.latitude}
          />
          <NumberInput
            decimalScale={5}
            label={tLocation("longitude")}
            hideControls
            {...longitudeInputProps}
            value={longitudeInputProps.value ?? value.longitude}
          />
        </Group>

        <Collapse expanded={searchQuery !== null}>
          {searchQuery && (
            <LocationSearchResults
              query={searchQuery}
              onLocationSelect={onLocationSelect}
              onClose={() => setSearchQuery(null)}
            />
          )}
        </Collapse>
      </Stack>
    </Fieldset>
  );
};

const isOptionLocation = (value: unknown): value is OptionLocation =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  typeof value.name === "string" &&
  "latitude" in value &&
  typeof value.latitude === "number" &&
  "longitude" in value &&
  typeof value.longitude === "number";

type LocationOnChange = (
  location: Pick<OptionLocation, "name"> & {
    latitude: OptionLocation["latitude"] | "";
    longitude: OptionLocation["longitude"] | "";
  },
) => void;

interface LocationSearchResultsProps {
  query: string;
  onLocationSelect: (location: OptionLocation) => void;
  onClose: () => void;
}

const LocationSearchResults = ({ query, onLocationSelect, onClose }: LocationSearchResultsProps) => {
  const tLocation = useI18n("widget.common.location");
  const tCommon = useI18n("common");
  const { data, isPending, error, refetch } = clientApi.location.searchCity.useQuery({ query });

  if (error) {
    return (
      <Stack gap="xs">
        <Alert title={tCommon("error")} color="red">
          <Button variant="light" color="red" size="compact-sm" onClick={() => void refetch()}>
            {tCommon("action.tryAgain")}
          </Button>
        </Alert>
        <Group justify="right">
          <Button variant="default" size="compact-sm" onClick={onClose}>
            {tCommon("action.close")}
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack component="section" aria-label={tLocation("search")} gap="xs">
      <Stack gap={4} mah={320} style={{ overflow: "hidden auto" }}>
        {isPending && (
          <Group justify="center" py="md">
            <Loader />
          </Group>
        )}
        {!isPending && data?.results.length === 0 && (
          <Text ta="center" c="dimmed" py="md">
            {tCommon("noResults")}
          </Text>
        )}
        {data?.results.map((city) => (
          <LocationSelectResult key={city.id} city={city} onLocationSelect={onLocationSelect} />
        ))}
      </Stack>
      <Group justify="right">
        <Button variant="default" size="compact-sm" onClick={onClose}>
          {tCommon("action.close")}
        </Button>
      </Group>
    </Stack>
  );
};

interface LocationSelectResultProps {
  city: RouterOutputs["location"]["searchCity"]["results"][number];
  onLocationSelect: (location: OptionLocation) => void;
}

const LocationSelectResult = ({ city, onLocationSelect }: LocationSelectResultProps) => {
  const t = useI18n("widget.common.location.table");
  const locale = useCurrentIntlLocale();
  let populationLabel = t("population.fallback");
  if (city.population) {
    populationLabel = `${t("header.population")}: ${formatLocalizedCompactNumber(city.population, locale)}`;
  }
  const onSelect = useCallback(() => {
    onLocationSelect({
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
    });
  }, [city, onLocationSelect]);

  return (
    <Paper withBorder p="xs">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={2} miw={0}>
          <Text fw={500} style={{ overflowWrap: "anywhere" }}>
            {city.name}
          </Text>
          <Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>
            {city.country}
          </Text>
          <Group gap="xs" wrap="wrap">
            <Anchor
              size="xs"
              target="_blank"
              href={`https://www.google.com/maps/place/${city.latitude},${city.longitude}`}
            >
              {city.latitude}, {city.longitude}
            </Anchor>
            <Text size="xs" c="dimmed">
              {populationLabel}
            </Text>
          </Group>
        </Stack>
        <Tooltip
          label={t("action.select", {
            city: city.name,
            countryCode: city.country_code ?? "??",
          })}
        >
          <ActionIcon
            flex="0 0 auto"
            color="red"
            variant="subtle"
            onClick={onSelect}
            aria-label={t("action.select", {
              city: city.name,
              countryCode: city.country_code ?? "??",
            })}
          >
            <IconClick size="var(--mantine-font-size-md)" />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
};
