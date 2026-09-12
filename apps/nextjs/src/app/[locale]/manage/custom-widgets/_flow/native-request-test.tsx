"use client";

import { useMemo, useRef, useState } from "react";
import { Alert, Button, Code, Fieldset, Select, Stack, Text } from "@mantine/core";
import { fetchApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { nativeLiteralDefault, nativeParameterFields } from "./native-editor-model";
import type { NativeInputSchema } from "./native-editor-model";
import { NativeLiteralInput } from "./native-literal-input";

export interface NativePreviewProps {
  previewSessionId?: string;
  previewStale?: boolean;
  previewLiveActions?: boolean;
}

export function NativeRequestTest({
  id,
  input,
  schema,
  action,
  previewSessionId,
  previewStale,
  previewLiveActions,
}: NativePreviewProps & {
  id: string;
  input: unknown;
  schema: NativeInputSchema;
  action: boolean;
}) {
  const t = useI18n("customWidget.flow");
  const fields = nativeParameterFields(input, schema);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [types, setTypes] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const pending = useRef(false);
  const [result, setResult] = useState<{
    context: string;
    error?: string;
    data?: unknown;
    status?: number;
    simulated?: boolean;
  }>();
  const responseText = useMemo(() => JSON.stringify(result?.data, null, 2) ?? "", [result?.data]);
  const params: Record<string, string | number | boolean> = {};
  let valid = true;
  const controls = fields.map(({ name, schema: fieldSchema }) => {
    const type = types[name] ?? fieldSchema.type;
    const primitive = ["string", "number", "integer", "boolean"].includes(String(type));
    const needsType = !["string", "number", "integer", "boolean"].includes(String(fieldSchema.type));
    const selectedSchema = primitive ? { ...fieldSchema, type } : { type: "string" };
    const value = values[name] ?? nativeLiteralDefault(selectedSchema);
    if (
      typeof value === "string" ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    )
      params[name] = value;
    else valid = false;
    if ((type === "integer" || type === "number") && typeof value !== "number") valid = false;
    return (
      <Stack gap="xs" key={name}>
        {needsType && (
          <Select
            label={t("nativeParameterType", { name })}
            value={types[name] ?? "string"}
            data={["string", "number", "boolean"]}
            onChange={(next) => {
              if (!next) return;
              setTypes((current) => ({ ...current, [name]: next }));
              setValues((current) => ({ ...current, [name]: nativeLiteralDefault({ type: next }) }));
            }}
          />
        )}
        <NativeLiteralInput
          label={name}
          schema={selectedSchema}
          value={value}
          required
          disabled={running}
          onChange={(next) => setValues((current) => ({ ...current, [name]: next }))}
        />
      </Stack>
    );
  });
  const context = JSON.stringify({ previewSessionId, id, input, params });
  const unavailable = !previewSessionId || previewStale;
  const liveAction = action && previewLiveActions;
  const run = async () => {
    if (!previewSessionId || previewStale || liveAction || !valid || pending.current) return;
    pending.current = true;
    setRunning(true);
    try {
      const request = { previewSessionId, nativeId: id, params };
      // confirmed=false also prevents a live action if the session mode changed before dispatch.
      const response = await (action
        ? fetchApi.customWidget.nativeAction.mutate({ ...request, confirmed: false })
        : fetchApi.customWidget.nativeQuery.query(request));
      setResult({
        context,
        data: response.data,
        status: response.status,
        simulated: response.simulated,
        error: "error" in response ? response.error : undefined,
      });
    } catch (error) {
      setResult({ context, error: error instanceof Error ? error.message : String(error) });
    } finally {
      pending.current = false;
      setRunning(false);
    }
  };
  return (
    <Fieldset legend={t("nativeTestTitle")} data-workbench-local-input>
      <Stack gap="sm">
        {controls}
        {unavailable && (
          <Text size="xs" c="dimmed">
            {t("nativeTestNeedsPreview")}
          </Text>
        )}
        {liveAction && <Alert color="yellow">{t("nativeTestLiveDisabled")}</Alert>}
        <Button
          variant="light"
          loading={running}
          disabled={unavailable || liveAction || !valid}
          onClick={() => void run()}
        >
          {action ? t("nativeTestSimulate") : t("nativeTestQuery")}
        </Button>
        {result && (
          <Stack gap="xs">
            {(result.context !== context || previewStale) && (
              <Text size="xs" c="orange">
                {t("nativeTestStaleResult")}
              </Text>
            )}
            {result.error && <Alert color="red">{result.error}</Alert>}
            {result.simulated && (
              <Text size="sm" component="output">
                {t("nativeTestSimulated")}
              </Text>
            )}
            {result.status !== undefined && !result.simulated && (
              <Text size="xs" component="output">
                {t("nativeTestStatus", { status: result.status })}
              </Text>
            )}
            {result.data !== undefined && !result.simulated && (
              <Code block mah={260} style={{ overflow: "auto" }}>
                {responseText.slice(0, 32768)}
              </Code>
            )}
            {responseText.length > 32768 && (
              <Text size="xs" c="dimmed">
                {t("nativeTestDataTruncated")}
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Fieldset>
  );
}
