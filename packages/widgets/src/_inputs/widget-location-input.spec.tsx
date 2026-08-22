// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WidgetLocationInput } from "./widget-location-input";
import { optionsBuilder } from "../options";

const defaultLocation = { name: "Paris", latitude: 48.8566, longitude: 2.3522 };
const locationOptions = optionsBuilder.from((factory) => ({
  location: factory.location({ defaultValue: defaultLocation }),
})).location;

const mocks = vi.hoisted(() => ({
  values: {} as Record<string, unknown>,
  setFieldValue: vi.fn(),
}));

vi.mock("@mantine/core", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Input = ({ label, value }: { label?: ReactNode; value?: string | number }) => (
    <label>
      {label}
      <input value={value ?? ""} readOnly />
    </label>
  );

  return {
    Button: Container,
    Fieldset: Container,
    Group: Container,
    NumberInput: Input,
    Stack: Container,
    TextInput: Input,
    Tooltip: Container,
  };
});

vi.mock("@homarr/modals", () => ({
  createModal: () => ({ withOptions: () => null }),
  useModalAction: () => ({ openModal: vi.fn() }),
}));

vi.mock("@homarr/translation/client", () => ({
  useCurrentIntlLocale: () => "en",
  useI18n: () => (key: string) => key,
}));

vi.mock("./common", async (importOriginal) => ({
  ...(await importOriginal()),
  useWidgetInputTranslation: () => (key: string) => key,
}));

vi.mock("./form", () => ({
  useFormContext: () => ({
    getInputProps: (path: string) => ({ value: mocks.values[path], onChange: vi.fn() }),
    setFieldValue: mocks.setFieldValue,
    clearFieldError: vi.fn(),
    watch: vi.fn(),
  }),
}));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.values = {};
  mocks.setFieldValue.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});

const renderInput = async () => {
  await act(async () => {
    root.render(
      <WidgetLocationInput kind="weather" property="location" options={locationOptions} initialOptions={{}} />,
    );
  });
};

describe("location input initialization", () => {
  it("hydrates a missing location with the default value", async () => {
    await renderInput();

    expect(mocks.setFieldValue).toHaveBeenCalledOnce();
    expect(mocks.setFieldValue).toHaveBeenCalledWith("options.location", defaultLocation);
  });

  it("does not reset a transient empty coordinate after initialization", async () => {
    mocks.values = {
      "options.location": defaultLocation,
      "options.location.name": defaultLocation.name,
      "options.location.latitude": defaultLocation.latitude,
      "options.location.longitude": defaultLocation.longitude,
    };
    await renderInput();

    mocks.values = {
      ...mocks.values,
      "options.location": { ...defaultLocation, latitude: "" },
      "options.location.latitude": "",
    };
    await renderInput();

    expect(mocks.setFieldValue).not.toHaveBeenCalled();
  });
});
