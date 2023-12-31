"use client";

import type { FocusEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { IntegrationSort } from "@homarr/db/schema/items";
import { getSecretSorts } from "@homarr/db/schema/items";
import { useForm, zodResolver } from "@homarr/form";
import {
  Box,
  Button,
  Combobox,
  Fieldset,
  Group,
  InputBase,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from "@homarr/ui";
import type { z } from "@homarr/validation";
import { v } from "@homarr/validation";

import { api } from "~/trpc/react";
import { IntegrationSecretInput } from "../_secret-inputs";
import { revalidatePathAction } from "./action";

interface NewIntegrationFormProps {
  serviceData: { value: string; label: string; url: string }[];
  searchParams: Partial<z.infer<typeof v.integration.create>> & {
    sort: IntegrationSort;
  };
}

export const NewIntegrationForm = ({
  serviceData,
  searchParams,
}: NewIntegrationFormProps) => {
  const secretsSorts = getSecretSorts(searchParams.sort);
  const router = useRouter();
  const form = useForm<FormType>({
    initialValues: {
      name: searchParams.name ?? "",
      serviceId: (searchParams.serviceId ?? null)!,
      secrets: secretsSorts.map((sort) => ({
        sort,
        value: "",
      })),
    },
    validate: zodResolver(v.integration.create.omit({ sort: true })),
  });
  const { mutateAsync, isPending } = api.integration.create.useMutation();

  const handleSubmit = async (values: FormType) => {
    await mutateAsync({
      sort: searchParams.sort,
      ...values,
    });
    await revalidatePathAction("/integrations");
    router.push("/integrations");
  };

  return (
    <form onSubmit={form.onSubmit((v) => void handleSubmit(v))}>
      <Stack>
        <TextInput label="Name" {...form.getInputProps("name")} />

        <ServiceSelect
          data={serviceData}
          callbackUrl={createCallbackUrl({
            name: form.values.name,
            sort: searchParams.sort,
          })}
          {...form.getInputProps("serviceId")}
        />

        <Fieldset legend="Secrets">
          <Stack gap="sm">
            {secretsSorts.map((sort, index) => (
              <IntegrationSecretInput
                key={sort}
                sort={sort}
                {...form.getInputProps(`secrets.${index}.value`)}
              />
            ))}
          </Stack>
        </Fieldset>

        <Group justify="flex-end">
          <Button variant="default" component={Link} href="/integrations">
            Back to overview
          </Button>
          <Button type="submit" loading={isPending}>
            Create
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

const createCallbackUrl = (values: { name: string; sort: string }) => {
  if (typeof window === "undefined") {
    return "";
  }

  const callbackUrl = new URL(window.location.href);
  callbackUrl.searchParams.set("name", values.name);
  callbackUrl.searchParams.set("sort", values.sort);
  callbackUrl.searchParams.set("serviceId", "%s");

  return callbackUrl.toString();
};

type FormType = Omit<z.infer<typeof v.integration.create>, "sort">;

interface ServiceSelectProps {
  data: { value: string; label: string; url: string }[];
  callbackUrl: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onFocus?: (ev: FocusEvent<HTMLInputElement, Element>) => void;
  onBlur?: (ev: FocusEvent<HTMLInputElement, Element>) => void;
}

export const ServiceSelect = ({
  data,
  callbackUrl,
  value,
  onChange,
  error,
  onFocus,
  onBlur,
}: ServiceSelectProps) => {
  const router = useRouter();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [search, setSearch] = useState(
    data.find((v) => v.value === value)?.label ?? "",
  );

  const exactOptionMatch = data.some((item) => item.label === search);
  const filteredOptions = exactOptionMatch
    ? data
    : data
        .filter((item) =>
          item.label.toLowerCase().includes(search.toLowerCase().trim()),
        )
        .slice(0, 10);

  const options = filteredOptions.map((item) => (
    <Combobox.Option value={item.value} key={item.value}>
      <div>
        <Text fz="sm" fw={500}>
          {item.label}
        </Text>
        <Text fz="xs" opacity={0.6}>
          {item.url}
        </Text>
      </div>
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        if (val === "$create") {
          router.push(
            `/services/new?callbackUrl=${encodeURIComponent(
              callbackUrl,
            )}&name=${encodeURIComponent(search)}`,
          );
          return;
        } else {
          onChange(val);
          const item = data.find((item) => item.value === val);
          setSearch(item?.label ?? "");
        }

        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <Box pos="relative">
          <InputBase
            w="100%"
            styles={{ input: { paddingBottom: 36, paddingTop: 16 } }}
            label="Service"
            rightSection={<Combobox.Chevron />}
            value={search}
            error={error}
            onChange={(event) => {
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
              setSearch(event.currentTarget.value);
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={(e) => {
              onFocus?.(e);
              combobox.openDropdown();
            }}
            onBlur={(e) => {
              onBlur?.(e);
              combobox.closeDropdown();
              setSearch(data.find((item) => item.value === value)?.label ?? "");
            }}
            placeholder="Search value"
            rightSectionPointerEvents="none"
          />
          <Text
            size="xs"
            c="gray.6"
            pos="absolute"
            top={52}
            left={12}
            style={{ userSelect: "none", pointerEvents: "none" }}
          >
            {data.find((item) => item.value === value)?.url}
          </Text>
        </Box>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {options}
          {!exactOptionMatch && search.trim().length > 0 && (
            <Combobox.Option value="$create">
              + Create {search} as Service
            </Combobox.Option>
          )}
          {options.length === 0 && search.trim().length === 0 && (
            <Combobox.Option disabled value="">
              No services found
            </Combobox.Option>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
