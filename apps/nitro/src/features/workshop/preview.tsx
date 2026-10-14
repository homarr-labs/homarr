import { useState } from "react";
import { Alert, Button, Checkbox, Code, Group, Loader, Stack, Text, Textarea } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { WorkshopFeatureClient, WorkshopPreview, WorkshopWidget } from "./client";
import { WorkshopConfigurationRequest } from "./configuration";
import { useWorkshopMutation } from "./flow";
import {
  isAmbiguousWorkshopFailure,
  useInvalidateWorkshop,
  useWorkshopFeature,
  WorkshopFailure,
  WorkshopWriteOutcomeHold,
} from "./scope";
import { useWorkshopSourceSetup, WorkshopSecurityReview, WorkshopSourceSetupPanel } from "./source-setup";

export function WorkshopPreviewCreate({
  widget,
  definitionId,
  onCreated,
}: {
  widget: WorkshopWidget;
  definitionId?: string;
  onCreated?(preview: WorkshopPreview): void;
}) {
  return (
    <WorkshopPreviewSetup
      key={`${definitionId ?? "new"}:${JSON.stringify(widget)}`}
      widget={widget}
      definitionId={definitionId}
      onCreated={onCreated}
    />
  );
}

function WorkshopPreviewSetup({
  widget,
  definitionId,
  onCreated,
}: {
  widget: WorkshopWidget;
  definitionId?: string;
  onCreated?(preview: WorkshopPreview): void;
}) {
  const { client, core, readOnly } = useWorkshopFeature();
  const setup = useWorkshopSourceSetup(widget);
  const create = useWorkshopMutation({
    identity: JSON.stringify(["preview-create", definitionId ?? null, widget]),
    recipient: onCreated,
    mutationFn: (input: Parameters<WorkshopFeatureClient["customWidget"]["previewCreate"]>[0], lease) =>
      client.customWidget.previewCreate(input, { signal: lease.signal }),
    onSuccess: (result, lease) => {
      setup.clearSecrets();
      if (lease.isCurrent()) onCreated?.(result);
    },
  });
  return (
    <Stack>
      <WorkshopSourceSetupPanel
        setups={setup.setups}
        values={setup.values}
        onChange={setup.setValue}
        disabled={readOnly || create.isPending || create.isSuccess}
      />
      <WorkshopSecurityReview widget={setup.configuredWidget} />
      <Text size="sm">
        The server normalizes and validates this definition. Existing edit credentials are inherited only for matching
        security bindings; edit previews capture the saved-state fingerprint.
      </Text>
      {create.isError && <WorkshopFailure error={create.error} />}
      <Button
        loading={create.isPending}
        disabled={
          readOnly ||
          create.isPending ||
          create.isSuccess ||
          !setup.ready ||
          !core.getImportReview(setup.configuredWidget)
        }
        onClick={() => {
          if (!readOnly && !create.isPending && !create.isSuccess && setup.ready)
            create.mutate({ definition: setup.configuredWidget, definitionId, secrets: setup.secrets });
        }}
      >
        Create validated preview
      </Button>
      {create.data && <WorkshopPreviewInspect key={create.data.previewSession.id} preview={create.data} />}
    </Stack>
  );
}

interface WorkshopPreviewInspectProps {
  preview: WorkshopPreview;
  onSaved?(definitionId: string): void;
}

export function WorkshopPreviewInspect({ preview, onSaved }: WorkshopPreviewInspectProps) {
  return (
    <WorkshopPreviewInspector
      key={JSON.stringify([preview.previewSession.id, preview.previewSession.revision])}
      preview={preview}
      onSaved={onSaved}
    />
  );
}

function WorkshopPreviewInspector({ preview, onSaved }: WorkshopPreviewInspectProps) {
  const { client, queryKey, readOnly } = useWorkshopFeature();
  const invalidate = useInvalidateWorkshop();
  const [confirmed, setConfirmed] = useState(false);
  const sessionId = preview.previewSession.id;
  const snapshot = useQuery({
    queryKey: [...queryKey, "preview", sessionId, preview.previewSession.revision],
    queryFn: ({ signal }) => client.customWidget.previewGet({ sessionId }, { signal }),
  });
  const journal = useQuery({
    queryKey: [...queryKey, "journal", sessionId, preview.previewSession.revision],
    queryFn: ({ signal }) => client.customWidget.previewJournal({ sessionId }, { signal }),
  });
  const save = useWorkshopMutation({
    identity: JSON.stringify(["preview-save", sessionId, preview.previewSession.revision, preview.persistenceTool]),
    recipient: onSaved,
    mutationFn: async (_input: undefined, lease) => {
      if (readOnly || !confirmed || snapshot.data?.revision !== preview.previewSession.revision)
        throw new Error("Preview confirmation or revision is no longer current");
      const current = await client.customWidget.previewGet({ sessionId }, { signal: lease.signal });
      lease.assertCurrent();
      if (current.revision !== preview.previewSession.revision)
        throw new Error("The reviewed preview revision changed");
      return preview.persistenceTool === "customWidget_updateFromPreview"
        ? client.customWidget.updateFromPreview({ previewSessionId: sessionId }, { signal: lease.signal })
        : client.customWidget.createFromPreview({ previewSessionId: sessionId }, { signal: lease.signal });
    },
    onSuccess: (result, lease) => {
      void invalidate(lease);
      if (lease.isCurrent()) onSaved?.(result.id);
    },
  });
  if (snapshot.isPending) return <Loader aria-label="Loading validated preview" size="sm" />;
  if (snapshot.isError) return <WorkshopFailure error={snapshot.error} retry={() => void snapshot.refetch()} />;
  const stale = snapshot.data.revision !== preview.previewSession.revision;
  const uncertain = save.isError && isAmbiguousWorkshopFailure(save.error);
  const disabled = readOnly || stale || save.isPending || save.isSuccess || uncertain;
  return (
    <Stack>
      <Text fw={600}>
        {snapshot.data.name}, preview revision {snapshot.data.revision}
      </Text>
      <Text size="sm">
        Expires: {String(snapshot.data.expiresAt)}. Actions:{" "}
        {snapshot.data.liveActions ? "Live actions enabled externally" : "Simulated"}.
      </Text>
      {stale && (
        <Alert color="yellow">
          The preview revision changed. Return to the editor and obtain the current preview and evidence checklist
          before saving.
        </Alert>
      )}
      <details>
        <summary>Inspect normalized JSX</summary>
        <Code block style={{ maxHeight: "24rem", overflow: "auto" }}>
          {snapshot.data.template}
        </Code>
      </details>
      {preview.sourceConfigurations.map((source) => (
        <WorkshopConfigurationRequest
          key={source.sourceId}
          target={{ previewSessionId: sessionId }}
          sourceId={source.sourceId}
        />
      ))}
      {preview.queries.map((request) => (
        <WorkshopPreviewRequest
          key={`query:${request.requestId}`}
          sessionId={sessionId}
          requestId={request.requestId}
          expectedRevision={preview.previewSession.revision}
          kind="query"
          parameterNames={request.parameterNames}
          disabled={disabled}
          onExecuted={() => {
            setConfirmed(false);
            void journal.refetch();
          }}
        />
      ))}
      {preview.actions.map((request) => (
        <Stack key={`action:${request.requestId}`} gap="xs">
          <Text size="sm">
            {request.method}. Minimum board permission: {request.minimumBoardPermission}. Invalidates:{" "}
            {request.invalidates.join(", ") || "None"}.
          </Text>
          <Code block>{JSON.stringify(request.confirmation, null, 2)}</Code>
          <WorkshopPreviewRequest
            sessionId={sessionId}
            requestId={request.requestId}
            expectedRevision={preview.previewSession.revision}
            kind="action"
            parameterNames={request.parameterNames}
            disabled
            onExecuted={() => {
              setConfirmed(false);
              void journal.refetch();
            }}
          />
        </Stack>
      ))}
      {preview.actions.length > 0 && (
        <Alert color="yellow" title="Action testing requires a frozen execution boundary">
          The native action endpoint has no atomic simulation-only input. Reading the preview mode first cannot prevent
          another client enabling live actions before dispatch. Action testing is held here; use current evidence from
          the authoritative editor before saving. This surface never enables live actions.
        </Alert>
      )}
      <Alert>
        Run every query and simulated action in this exact revision. Homarr validates current server evidence again when
        saving; a local checkbox does not replace evidence.
      </Alert>
      {journal.isError && <WorkshopFailure error={journal.error} retry={() => void journal.refetch()} />}
      {journal.data && (
        <details>
          <summary>Redacted request journal</summary>
          <Code block style={{ maxHeight: "18rem", overflow: "auto" }}>
            {JSON.stringify(journal.data, null, 2)}
          </Code>
        </details>
      )}
      <Checkbox
        checked={confirmed}
        disabled={disabled}
        label="I reviewed current responses, action metadata, and normalized content"
        onChange={(event) => setConfirmed(event.currentTarget.checked)}
      />
      {save.isError && (
        <WorkshopFailure
          error={save.error}
          retry={() => {
            setConfirmed(false);
            void snapshot.refetch();
            void journal.refetch();
          }}
        />
      )}
      {save.isSuccess && <Alert color="green">The exact tested preview was saved.</Alert>}
      {uncertain && <WorkshopWriteOutcomeHold />}
      <Button
        loading={save.isPending}
        disabled={disabled || !confirmed}
        onClick={() => {
          if (!disabled && confirmed) save.mutate(undefined);
        }}
      >
        {preview.persistenceTool === "customWidget_updateFromPreview"
          ? "Update saved widget from preview"
          : "Save tested preview"}
      </Button>
    </Stack>
  );
}

function WorkshopPreviewRequest({
  sessionId,
  requestId,
  expectedRevision,
  kind,
  parameterNames,
  disabled,
  onExecuted,
}: {
  sessionId: string;
  requestId: string;
  expectedRevision: number;
  kind: "query" | "action";
  parameterNames: string[];
  disabled: boolean;
  onExecuted(): void;
}) {
  const { client, readOnly } = useWorkshopFeature();
  const [text, setText] = useState("{}");
  const [confirmed, setConfirmed] = useState(false);
  const request = useWorkshopMutation({
    identity: JSON.stringify(["preview-request", sessionId, expectedRevision, requestId, kind]),
    mutationFn: async (_input: undefined, lease) => {
      if (disabled || readOnly || !confirmed) throw new Error("Request is not confirmed");
      const params = parsePreviewParameters(text);
      const snapshot = await client.customWidget.previewGet({ sessionId }, { signal: lease.signal });
      lease.assertCurrent();
      if (kind === "action") {
        throw new Error("Action dispatch is held until a simulation-only execution boundary is frozen");
      }
      if (snapshot.revision !== expectedRevision) throw new Error("The reviewed preview revision changed");
      return client.customWidget.previewQuery({ sessionId, requestId, params }, { signal: lease.signal });
    },
    onSuccess: onExecuted,
  });
  return (
    <Stack gap="xs" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
      <Text fw={600}>
        {requestId}, {kind === "action" ? "simulated action" : "real service query"}
      </Text>
      <Text size="sm">Required parameters: {parameterNames.join(", ") || "None"}</Text>
      <Textarea
        label={`Parameters for ${requestId}`}
        value={text}
        disabled={disabled || request.isPending}
        maxLength={10000}
        onChange={(event) => {
          setText(event.currentTarget.value);
          setConfirmed(false);
          request.reset();
        }}
      />
      <Checkbox
        checked={confirmed}
        disabled={disabled || request.isPending}
        label={
          kind === "query"
            ? "Run this query against the configured service"
            : "Test this action without making service changes"
        }
        onChange={(event) => setConfirmed(event.currentTarget.checked)}
      />
      <Group>
        <Button
          variant="default"
          loading={request.isPending}
          disabled={disabled || request.isPending || !confirmed}
          onClick={() => request.mutate(undefined)}
        >
          {kind === "query" ? "Run preview query" : "Test simulated action"}
        </Button>
      </Group>
      {request.isError && <WorkshopFailure error={request.error} />}
      {request.data && (
        <Code block style={{ maxHeight: "18rem", overflow: "auto" }}>
          {JSON.stringify(request.data, null, 2)}
        </Code>
      )}
    </Stack>
  );
}

function parsePreviewParameters(text: string): Record<string, string | number | boolean> {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    throw new Error("Parameters must be an object");
  const params: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
      throw new Error("Parameters must contain only strings, numbers, and booleans");
    params[key] = value;
  }
  return params;
}
