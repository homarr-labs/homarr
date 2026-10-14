import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Code,
  FileInput,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { WorkshopFeatureClient, WorkshopWidget } from "./client";
import { useWorkshopMutation } from "./flow";
import {
  isAmbiguousWorkshopFailure,
  useInvalidateWorkshop,
  useWorkshopFeature,
  WorkshopFailure,
  WorkshopTransportHold,
  WorkshopWriteOutcomeHold,
} from "./scope";
import { useWorkshopSourceSetup, WorkshopSecurityReview, WorkshopSourceSetupPanel } from "./source-setup";

export function WorkshopImport({ onImported }: { onImported?(definitionId: string): void }) {
  const { core, readOnly } = useWorkshopFeature();
  const [text, setText] = useState("");
  const [widget, setWidget] = useState<WorkshopWidget | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const file = useWorkshopMutation({
    identity: "import-file",
    mutationFn: async (value: File) => {
      if (value.size > 1_000_000) throw new Error("Widget files must be at most 1 MB");
      return value.text();
    },
    onSuccess: (value) => {
      setText(value);
      setWidget(null);
      setIssue(null);
    },
  });
  return (
    <Stack>
      <FileInput
        label="Import widget JSON"
        accept="application/json,.json"
        disabled={readOnly || file.isPending}
        onChange={(value) => {
          setWidget(null);
          setIssue(null);
          if (value) file.mutate(value);
          else setText("");
        }}
      />
      {file.isError && (
        <Alert color="red">The file could not be read. Choose one widget JSON file no larger than 1 MB.</Alert>
      )}
      <Textarea
        label="Or paste widget JSON"
        autosize
        minRows={5}
        maxRows={14}
        value={text}
        maxLength={1_000_000}
        disabled={readOnly || file.isPending}
        onChange={(event) => {
          setText(event.currentTarget.value);
          setWidget(null);
          setIssue(null);
        }}
      />
      <Button
        disabled={readOnly || file.isPending || !text.trim()}
        onClick={() => {
          const result = core.parseCustomWidgetClipboardDetailed(text);
          if (result.success) {
            setWidget(result.widget);
            setIssue(null);
          } else {
            setWidget(null);
            setIssue(core.formatCustomWidgetImportIssues(result.issues));
          }
        }}
      >
        Review imported widget
      </Button>
      {issue && (
        <Alert color="red" title="Invalid widget">
          {issue}
        </Alert>
      )}
      {widget && <WorkshopImportReview key={JSON.stringify(widget)} widget={widget} onImported={onImported} />}
    </Stack>
  );
}

function WorkshopImportReview({
  widget,
  onImported,
}: {
  widget: WorkshopWidget;
  onImported?(definitionId: string): void;
}) {
  const { client, core, readOnly } = useWorkshopFeature();
  const invalidate = useInvalidateWorkshop();
  const setup = useWorkshopSourceSetup(widget);
  const [confirmed, setConfirmed] = useState(false);
  const mutation = useWorkshopMutation({
    identity: JSON.stringify(["import", widget]),
    recipient: onImported,
    mutationFn: (input: Parameters<WorkshopFeatureClient["customWidget"]["import"]>[0], lease) =>
      client.customWidget.import(input, { signal: lease.signal }),
    onSuccess: (result, lease) => {
      setup.clearSecrets();
      void invalidate(lease);
      if (lease.isCurrent()) onImported?.(result.id);
    },
  });
  const uncertain = mutation.isError && isAmbiguousWorkshopFailure(mutation.error);
  const disabled = readOnly || mutation.isPending || mutation.isSuccess || uncertain;
  return (
    <Stack>
      <WorkshopSourceSetupPanel
        setups={setup.setups}
        values={setup.values}
        disabled={disabled}
        onChange={(sourceId, value) => {
          setup.setValue(sourceId, value);
          setConfirmed(false);
        }}
      />
      <WorkshopSecurityReview widget={setup.configuredWidget} />
      <Checkbox
        checked={confirmed}
        disabled={disabled}
        label="I reviewed the widget's access and actions"
        onChange={(event) => setConfirmed(event.currentTarget.checked)}
      />
      {mutation.isError && <WorkshopFailure error={mutation.error} />}
      {uncertain && <WorkshopWriteOutcomeHold />}
      {mutation.isSuccess && (
        <Alert color="green">Widget imported. Configure any missing credentials before using its requests.</Alert>
      )}
      <Button
        loading={mutation.isPending}
        disabled={disabled || !setup.ready || !confirmed || !core.getImportReview(setup.configuredWidget)}
        onClick={() => {
          if (!disabled && setup.ready && confirmed)
            mutation.mutate({ widget: setup.configuredWidget, secrets: setup.secrets });
        }}
      >
        Import widget
      </Button>
    </Stack>
  );
}

export function WorkshopExport({ definitionId }: { definitionId: string }) {
  const { client, queryKey, core } = useWorkshopFeature();
  const query = useQuery({
    queryKey: [...queryKey, "export", definitionId],
    queryFn: ({ signal }) => client.customWidget.export({ id: definitionId }, { signal }),
  });
  if (query.isPending) return <Loader aria-label="Preparing portable widget export" size="sm" />;
  if (query.isError) return <WorkshopFailure error={query.error} retry={() => void query.refetch()} />;
  const portable = core.exportCustomWidgetDefinition(query.data);
  return (
    <Stack>
      <Text size="sm">
        Secret values and saved integration IDs are omitted. Review HTTP addresses, static headers, and template content
        before sharing.
      </Text>
      <Code block style={{ maxHeight: "24rem", overflow: "auto" }}>
        {JSON.stringify(portable, null, 2)}
      </Code>
      <Button onClick={() => downloadWorkshopWidget(portable)}>Download widget JSON</Button>
    </Stack>
  );
}

export function WorkshopPublish({
  definitionId,
  submissionId,
  onPublished,
}: {
  definitionId: string;
  submissionId?: string;
  onPublished?(id: string): void;
}) {
  const { transport } = useWorkshopFeature();
  if (transport.kind === "held") return <WorkshopTransportHold />;
  if (!transport.client.currentUser)
    return (
      <Alert color="yellow">
        Sign in to the genuine Workshop account before publishing. Homarr administrator access does not grant Workshop
        authorship.
      </Alert>
    );
  return (
    <WorkshopPublishForm
      key={`${definitionId}:${submissionId ?? "new"}:${transport.authorityKey}:${transport.client.currentUser.id}`}
      definitionId={definitionId}
      submissionId={submissionId}
      onPublished={onPublished}
    />
  );
}

function WorkshopPublishForm({
  definitionId,
  submissionId,
  onPublished,
}: {
  definitionId: string;
  submissionId?: string;
  onPublished?(id: string): void;
}) {
  const { client, transport, core, queryKey, readOnly } = useWorkshopFeature();
  const queryClient = useQueryClient();
  const [titleOverride, setTitle] = useState<string | null>(null);
  const [descriptionOverride, setDescription] = useState<string | null>(null);
  const [changelog, setChangelog] = useState("");
  const [confirmedContent, setConfirmedContent] = useState<string | null>(null);
  const exported = useQuery({
    queryKey: [...queryKey, "export", definitionId],
    queryFn: ({ signal }) => client.customWidget.export({ id: definitionId }, { signal }),
  });
  const previous = useQuery({
    queryKey: [
      ...queryKey,
      "publishTarget",
      transport.kind === "available" ? transport.authorityKey : "held",
      submissionId,
    ],
    enabled: Boolean(submissionId) && transport.kind === "available",
    queryFn: ({ signal }) => {
      if (!submissionId || transport.kind !== "available") throw new Error("Workshop update target is unavailable");
      return transport.client.get(submissionId, signal);
    },
  });
  const title = titleOverride ?? previous.data?.title ?? exported.data?.name ?? "";
  const description = descriptionOverride ?? previous.data?.description ?? exported.data?.description ?? "";
  const content = exported.data ? JSON.stringify(core.exportCustomWidgetDefinition(exported.data), null, 2) : "";
  const confirmationKey = JSON.stringify([content, title, description, changelog, previous.data?.revision]);
  const publish = useWorkshopMutation({
    identity: JSON.stringify(["publish", definitionId, submissionId ?? null, confirmationKey]),
    recipient: onPublished,
    mutationFn: async (_input: undefined, lease) => {
      if (
        transport.kind !== "available" ||
        !transport.client.currentUser ||
        readOnly ||
        confirmedContent !== confirmationKey ||
        !content
      )
        throw new Error("Publishing prerequisites changed");
      const input = {
        type: "customWidget" as const,
        title: title.trim(),
        description,
        content,
        changelog,
        outdated: previous.data?.outdated ?? false,
      };
      if (submissionId) {
        const latest = await transport.client.get(submissionId, lease.signal);
        lease.assertCurrent();
        if (
          !previous.data ||
          latest.author !== transport.client.currentUser.id ||
          latest.revision !== previous.data.revision
        )
          throw new Error("Workshop submission changed or belongs to another author");
        return transport.client.update(submissionId, input);
      }
      return transport.client.create(input);
    },
    onSuccess: (result, lease) => {
      void queryClient.invalidateQueries({ queryKey });
      if (lease.isCurrent()) onPublished?.(result.id);
    },
  });
  const ownTarget =
    !submissionId ||
    (previous.isSuccess &&
      transport.kind === "available" &&
      previous.data.author === transport.client.currentUser?.id &&
      previous.data.type === "customWidget");
  const uncertain = publish.isError && isAmbiguousWorkshopFailure(publish.error);
  const disabled = readOnly || publish.isPending || publish.isSuccess || uncertain;
  if (exported.isPending || (submissionId && previous.isPending))
    return <Loader aria-label="Preparing Workshop publication" size="sm" />;
  if (exported.isError || previous.isError)
    return (
      <WorkshopFailure
        error={exported.error ?? previous.error}
        retry={() => {
          void exported.refetch();
          if (submissionId) void previous.refetch();
        }}
      />
    );
  return (
    <Stack>
      {!ownTarget && (
        <Alert color="red">This submission is not a Custom JSX widget owned by your current Workshop account.</Alert>
      )}
      {previous.data && (
        <Text size="sm">
          Updating {previous.data.title}, revision {previous.data.revision}. Workshop controls ownership and publication
          validation.
        </Text>
      )}
      <TextInput
        label="Community title"
        value={title}
        minLength={3}
        maxLength={100}
        error={title.trim().length > 100 ? "Community titles must contain at most 100 characters." : undefined}
        disabled={disabled}
        onChange={(event) => setTitle(event.currentTarget.value)}
      />
      <Textarea
        label="Description"
        value={description}
        maxLength={2000}
        disabled={disabled}
        onChange={(event) => setDescription(event.currentTarget.value)}
      />
      {submissionId && (
        <Textarea
          label="Revision changelog"
          value={changelog}
          maxLength={2000}
          disabled={disabled}
          onChange={(event) => setChangelog(event.currentTarget.value)}
        />
      )}
      <Alert color="yellow">
        Secret values and local integration bindings are omitted. HTTP destinations and static template or request
        content remain: inspect them before publication.
      </Alert>
      <Code block style={{ maxHeight: "24rem", overflow: "auto" }}>
        {content}
      </Code>
      <Checkbox
        checked={confirmedContent === confirmationKey}
        disabled={disabled}
        label="I reviewed this exact portable definition and publication details"
        onChange={(event) => setConfirmedContent(event.currentTarget.checked ? confirmationKey : null)}
      />
      {publish.isError && <WorkshopFailure error={publish.error} />}
      {uncertain && <WorkshopWriteOutcomeHold />}
      {publish.isSuccess && <Alert color="green">Workshop accepted the publication.</Alert>}
      <Group>
        <Button
          loading={publish.isPending}
          disabled={disabled || !ownTarget || title.trim().length < 3 || confirmedContent !== confirmationKey}
          onClick={() => publish.mutate(undefined)}
        >
          {submissionId ? "Publish updated revision" : "Publish widget"}
        </Button>
      </Group>
    </Stack>
  );
}

function downloadWorkshopWidget(widget: WorkshopWidget) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(widget, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${widget.name.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "") || "custom-widget"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
