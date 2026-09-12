import type { ComponentType } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Alert, Box, Stack, Text } from "@mantine/core";
import { RendererErrorBoundary, ErrorAlert, createBoundaryKey } from "./renderer-boundary";

import { compileCustomWidgetStyles } from "../core/scoped-styles";
import type { CustomWidgetExtensions } from "../core/extensions-schema";
import { inspectCustomWidgetSource } from "./source-inspection";
import type { CustomWidgetSourceLocation } from "./source-inspection";
import { WidgetDetailProvider } from "./detail-views";
import { WidgetOverlayProvider } from "./overlay-scope";
import { WidgetContentContext, useCustomWidgetContent } from "./shared-content";
import { WidgetPreferencesContext, useCustomWidgetPreferences } from "./preferences";
import { useCustomWidgetEnvironment } from "./extension-environment";
import { renderSafeJsx } from "../jsx/interpreter";
import { CustomJsxInputsProvider } from "../jsx/runtime-components";
import type { WidgetInputType, WidgetInputValue } from "../jsx/runtime-components";
import { sameInputRecord, sameStringArray, sameTypeRecord } from "./input-state-utils";

export { CUSTOM_JSX_METHOD_COLORS, parseRequestCapabilities } from "./request-capabilities";

const EMPTY_RECORD: Record<string, never> = {};

export interface CustomJsxRendererMessages {
  noTemplate: string;
  close?: string;
  templateWarnings(count: number): string;
  bindingTypeConflict(name: string, firstType: WidgetInputType, secondType: WidgetInputType): string;
}

export interface CustomJsxRendererProps {
  template: string;
  extensions?: CustomWidgetExtensions;
  preferenceStorageKey?: string;
  inspect?: boolean;
  onInspect?(location: CustomWidgetSourceLocation): void;
  data: unknown;
  status?: Record<string, unknown>;
  options?: Record<string, unknown>;
  components: Readonly<Record<string, ComponentType<never>>>;
  createBindings(data: unknown): Readonly<Record<string, unknown>>;
  messages: CustomJsxRendererMessages;
}

export function CustomJsxRenderer(props: CustomJsxRendererProps) {
  if (!props.template.trim())
    return (
      <Alert color="gray" variant="light" p="xs">
        <Text size="xs" c="dimmed">
          {props.messages.noTemplate}
        </Text>
      </Alert>
    );

  return <CustomJsxRendererSession {...props} />;
}

interface InputRegistration {
  name: string;
  type: WidgetInputType;
  initialValue: WidgetInputValue;
}

interface InputState {
  values: Record<string, WidgetInputValue>;
  types: Record<string, WidgetInputType>;
}

function CustomJsxRendererSession({
  template,
  extensions,
  preferenceStorageKey,
  inspect,
  onInspect,
  data,
  status = EMPTY_RECORD,
  options = EMPTY_RECORD,
  components,
  createBindings,
  messages,
}: CustomJsxRendererProps) {
  const inputScopeId = useId();
  const scopeId = inputScopeId.replace(/[^a-zA-Z0-9_-]/gu, "");
  const preferences = useCustomWidgetPreferences(extensions?.preferences, preferenceStorageKey);
  const content = useCustomWidgetContent(extensions?.content);
  const environment = useCustomWidgetEnvironment();
  const stylesheet = useMemo(() => {
    if (!extensions?.stylesheet) return "";
    try {
      return compileCustomWidgetStyles(extensions.stylesheet, scopeId);
    } catch {
      return "";
    }
  }, [extensions?.stylesheet, scopeId]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [bindingErrors, setBindingErrors] = useState<string[]>([]);
  const [inputState, setInputState] = useState<InputState>({ values: {}, types: {} });
  const { values: inputs, types: inputTypes } = inputState;
  const registrations = useRef(new Map<symbol, InputRegistration>());
  const registrationVersion = useRef(0);
  const mounted = useRef(true);
  const bindingTypeConflict = messages.bindingTypeConflict;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const reconcileInputs = useCallback(() => {
    if (!mounted.current) return;
    const active = new Map<string, InputRegistration>();
    const conflicts: string[] = [];
    for (const registration of registrations.current.values()) {
      const existing = active.get(registration.name);
      if (!existing) {
        active.set(registration.name, registration);
        continue;
      }
      if (existing.type === registration.type) continue;
      const message = bindingTypeConflict(registration.name, existing.type, registration.type);
      if (!conflicts.includes(message) && conflicts.length < 5) conflicts.push(message);
    }
    setBindingErrors((current) => (sameStringArray(current, conflicts) ? current : conflicts));
    setInputState((current) => {
      const nextTypes: Record<string, WidgetInputType> = {};
      for (const [name, registration] of active) nextTypes[name] = registration.type;
      const nextValues: Record<string, WidgetInputValue> = {};
      for (const [name, registration] of active) {
        if (current.types[name] === registration.type && Object.hasOwn(current.values, name)) {
          const previousValue = current.values[name];
          if (previousValue !== undefined) {
            nextValues[name] = previousValue;
            continue;
          }
        }
        nextValues[name] = registration.initialValue;
      }
      if (sameTypeRecord(current.types, nextTypes) && sameInputRecord(current.values, nextValues)) return current;
      return { values: nextValues, types: nextTypes };
    });
  }, [bindingTypeConflict]);
  const registerInput = useCallback(
    (name: string, type: WidgetInputType, initialValue: WidgetInputValue) => {
      const id = Symbol(name);
      registrations.current.set(id, { name, type, initialValue });
      registrationVersion.current += 1;
      reconcileInputs();
      return () => {
        registrations.current.delete(id);
        registrationVersion.current += 1;
        const version = registrationVersion.current;
        queueMicrotask(() => {
          if (registrationVersion.current === version) reconcileInputs();
        });
      };
    },
    [reconcileInputs],
  );
  const setInputValue = useCallback((name: string, type: WidgetInputType, value: WidgetInputValue) => {
    setInputState((current) => {
      const existing = current.types[name];
      if (existing && existing !== type) return current;
      if (existing === type && Object.is(current.values[name], value)) return current;
      return {
        values: { ...current.values, [name]: value },
        types: existing === type ? current.types : { ...current.types, [name]: type },
      };
    });
  }, []);
  const resetInput = useCallback((name: string, type: WidgetInputType) => {
    let activeRegistration: InputRegistration | undefined;
    for (const registration of registrations.current.values()) {
      if (registration.name !== name) continue;
      activeRegistration = registration;
      break;
    }
    if (!activeRegistration || activeRegistration.type !== type) return;
    setInputState((current) => {
      if (current.types[name] !== type || Object.is(current.values[name], activeRegistration.initialValue)) {
        return current;
      }
      return { ...current, values: { ...current.values, [name]: activeRegistration.initialValue } };
    });
  }, []);
  const rendered = useMemo(() => {
    try {
      const bindings = {
        ...createBindings(data),
        status,
        options,
        inputs,
        preferences: preferences.values,
        content: content.values,
        contentStatus: content.status,
        theme: environment.theme,
        container: environment.container,
        props: {},
      };
      return {
        ...renderSafeJsx({
          template,
          components,
          bindings,
          scopeId,
          fragments: extensions?.fragments,
          captureSourceLocations: inspect,
        }),
        boundaryKey: createBoundaryKey(template, bindings, extensions?.fragments),
        error: null,
      };
    } catch (error) {
      return {
        node: null,
        warnings: [],
        boundaryKey: `${template.length}:error`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }, [
    components,
    createBindings,
    data,
    inputs,
    options,
    status,
    template,
    scopeId,
    extensions?.fragments,
    preferences.values,
    environment.theme,
    environment.container,
    inspect,
    content.values,
    content.status,
  ]);
  useEffect(() => setParseErrors([]), [rendered.boundaryKey, template]);
  const handleError = useCallback(
    (error: Error) =>
      setParseErrors((current) => {
        if (current.length >= 5 || current.includes(error.message)) return current;
        return [...current, error.message];
      }),
    [],
  );
  useEffect(() => {
    rendered.warnings.forEach((warning) => handleError(new Error(warning)));
    if (rendered.error) handleError(rendered.error);
  }, [handleError, rendered]);

  return (
    <Stack gap={0} h="100%">
      <Box
        onClickCapture={inspect ? (event) => inspectCustomWidgetSource(event, onInspect) : undefined}
        ref={environment.ref}
        data-cw-scope={scopeId}
        h="100%"
        style={{ contain: "layout paint style", isolation: "isolate", overflow: "auto", minHeight: 0 }}
      >
        {stylesheet && <style>{stylesheet}</style>}
        <WidgetOverlayProvider scopeId={scopeId}>
          <WidgetDetailProvider closeLabel={messages.close}>
            <WidgetPreferencesContext.Provider value={preferences}>
              <WidgetContentContext.Provider value={content}>
                {rendered.error ? (
                  <ErrorAlert error={rendered.error} />
                ) : (
                  <CustomJsxInputsProvider
                    scopeId={inputScopeId}
                    inputs={inputs}
                    inputTypes={inputTypes}
                    registerInput={registerInput}
                    setInputValue={setInputValue}
                    resetInput={resetInput}
                  >
                    <RendererErrorBoundary resetKey={rendered.boundaryKey} onError={handleError}>
                      {rendered.node}
                    </RendererErrorBoundary>
                  </CustomJsxInputsProvider>
                )}
              </WidgetContentContext.Provider>
            </WidgetPreferencesContext.Provider>
          </WidgetDetailProvider>
        </WidgetOverlayProvider>
      </Box>
      {[...parseErrors, ...bindingErrors].length > 0 && (
        <Alert color="yellow" variant="light" p="xs" mt="xs">
          <Text size="xs" c="dimmed">
            {messages.templateWarnings(parseErrors.length + bindingErrors.length)}
          </Text>
          {[...parseErrors, ...bindingErrors].map((message) => (
            <Text key={message} size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
              {message}
            </Text>
          ))}
        </Alert>
      )}
    </Stack>
  );
}
