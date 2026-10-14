import { useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Accordion,
  Anchor,
  Badge,
  Button,
  Checkbox,
  Code,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { IconDownload, IconFlag } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { WorkshopDetailScreen } from "../../source-ui/workshop";
import type { WorkshopSubmissionDetail } from "../../source-ui/workshop/contracts";
import { WorkshopReportForm, WorkshopVoteControl } from "./community";

import type { WorkshopDetail, WorkshopFeatureClient } from "./client";
import { useWorkshopMutation } from "./flow";
import {
  isAmbiguousWorkshopFailure,
  useInvalidateWorkshop,
  useWorkshopFeature,
  WorkshopFailure,
  WorkshopWriteOutcomeHold,
} from "./scope";
import { useWorkshopSourceSetup, WorkshopSecurityReview, WorkshopSourceSetupPanel } from "./source-setup";

export function WorkshopInstall(props: {
  submissionId: string;
  onInstalled?(definitionId: string): void;
  onBack?(): void;
  onExport?(submission: WorkshopSubmissionDetail): void;
}) {
  return <WorkshopInstallFlow key={props.submissionId} {...props} />;
}

function WorkshopInstallFlow({
  submissionId,
  onInstalled,
  onBack,
  onExport,
}: {
  submissionId: string;
  onInstalled?(definitionId: string): void;
  onBack?(): void;
  onExport?(submission: WorkshopSubmissionDetail): void;
}) {
  const { client, queryKey, transport, presentation } = useWorkshopFeature();
  const t = useI18n("workshop");
  const [reportOpened, setReportOpened] = useState(false);
  const detail = useQuery({
    queryKey: [...queryKey, "detail", submissionId],
    queryFn: ({ signal }) => client.customWidget.workshopGet({ submissionId }, { signal }),
  });
  const community = useQuery({
    queryKey: [
      ...queryKey,
      "communityDetail",
      transport.kind === "available" ? transport.authorityKey : "held",
      submissionId,
    ],
    enabled: transport.kind === "available",
    queryFn: ({ signal }) => {
      if (transport.kind !== "available") throw new Error("Workshop transport is not joined");
      return transport.client.get(submissionId, signal);
    },
  });
  let displayedReportCount = detail.data?.submission.reportCount;
  if (community.data && transport.kind === "available") displayedReportCount = community.data.reportCount;
  const reports = useQuery({
    queryKey: [...queryKey, "reports", transport.kind === "available" ? transport.authorityKey : "held", submissionId],
    enabled: transport.kind === "available" && Boolean(displayedReportCount),
    queryFn: () => {
      if (transport.kind !== "available") throw new Error("Workshop transport is not joined");
      return transport.client.listReportSummaries(submissionId);
    },
  });
  const renderPresentation = (review: ReactNode) => {
    if (community.data && transport.kind === "available")
      return (
        <WorkshopDetailScreen
          submission={community.data}
          reports={reports.data}
          reportFailure={
            reports.isError && <WorkshopFailure error={reports.error} retry={() => void reports.refetch()} />
          }
          fileUrl={(id, filename, thumb) => transport.client.fileUrl(id, filename, thumb)}
          presentation={presentation}
          onBack={onBack}
          communityUrl={detail.data?.submission.url}
          review={
            <Paper withBorder radius="md" p="md">
              {review}
            </Paper>
          }
          reportForm={
            <WorkshopReportForm
              submissionId={submissionId}
              opened={reportOpened}
              onClose={() => setReportOpened(false)}
            />
          }
          footer={
            <Group justify="space-between" align="center" gap="sm" wrap="wrap">
              <Group gap="xs" wrap="wrap">
                <WorkshopVoteControl submissionId={submissionId} score={community.data.score} />
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-sm"
                  leftSection={<IconDownload size={16} />}
                  disabled={!onExport}
                  onClick={() => {
                    if (community.data) onExport?.(community.data);
                  }}
                >
                  {t("export")}
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  size="compact-sm"
                  leftSection={<IconFlag size={16} />}
                  aria-expanded={reportOpened}
                  aria-controls="workshop-report-form"
                  onClick={() => setReportOpened((opened) => !opened)}
                >
                  Inspect report form
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                Voting and report submission are held. Installation requires native source and writer admission.
              </Text>
            </Group>
          }
        />
      );
    if (!detail.data) return review;
    return (
      <Stack>
        <Title order={2}>{detail.data.submission.title}</Title>
        <Text>{detail.data.submission.description}</Text>
        <Text size="sm">
          By {detail.data.submission.authorName || "Community member"}. Revision {detail.data.submission.revision}.
        </Text>
        <Anchor href={detail.data.submission.url} target="_blank" rel="noopener noreferrer">
          View community submission
        </Anchor>
        {transport.kind === "held" && (
          <Alert color="yellow">
            Original community detail, screenshot gallery, raw source and reports require the Workshop connection.
            Native validation below does not fabricate that data.
          </Alert>
        )}
        {community.isError && (
          <Alert color="yellow">
            Community screenshots could not be loaded. Native validation remains the installation authority.
          </Alert>
        )}
        {detail.data.submission.outdated && (
          <Alert color="yellow">This submission is marked outdated. Review compatibility before installation.</Alert>
        )}
        {detail.data.submission.reportCount > 0 && (
          <Alert color="red" title="Community safety reports">
            <Stack gap="xs">
              <Text>
                {detail.data.submission.reportCount} reports were recorded. Reports are warnings, not a safety verdict.
              </Text>
              {reports.data?.map((report) => (
                <Text key={report.id} size="sm">
                  {report.category}: {report.explanation}
                </Text>
              ))}
              {transport.kind === "held" && <Text size="sm">Report explanations require the Workshop connection.</Text>}
              {reports.isError && <WorkshopFailure error={reports.error} retry={() => void reports.refetch()} />}
            </Stack>
          </Alert>
        )}
        {review}
      </Stack>
    );
  };
  if (!detail.data) {
    if (detail.isPending)
      return renderPresentation(
        <Group component="output" aria-live="polite">
          <Loader size="sm" />
          <Text>Validating community widget</Text>
        </Group>,
      );
    return renderPresentation(<WorkshopFailure error={detail.error} retry={() => void detail.refetch()} />);
  }
  const revisionChanged =
    transport.kind === "available" &&
    Boolean(community.data && community.data.revision !== detail.data.submission.revision);
  return (
    <WorkshopInstallReview
      key={`${submissionId}:${detail.data.submission.revision}:${JSON.stringify(detail.data.widget.sources)}`}
      detail={detail.data}
      onInstalled={onInstalled}
      held={revisionChanged || detail.isError}
      holdFeedback={
        <>
          {revisionChanged && (
            <Alert color="yellow">
              The community revision changed during review. Reload both the validated widget and community detail before
              installation.
            </Alert>
          )}
          {detail.isError && <WorkshopFailure error={detail.error} retry={() => void detail.refetch()} />}
        </>
      }
      renderPresentation={renderPresentation}
    />
  );
}

function WorkshopInstallReview({
  detail,
  onInstalled,
  held,
  holdFeedback,
  renderPresentation,
}: {
  detail: WorkshopDetail;
  onInstalled?(definitionId: string): void;
  held: boolean;
  holdFeedback: ReactNode;
  renderPresentation(review: ReactNode): ReactNode;
}) {
  const { client, readOnly, core } = useWorkshopFeature();
  const invalidate = useInvalidateWorkshop();
  const setup = useWorkshopSourceSetup(detail.widget, detail.sourceSetup);
  const [name, setName] = useState(detail.widget.name);
  const [opened, setOpened] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const install = useWorkshopMutation({
    identity: JSON.stringify(["install", detail.submission.id, detail.submission.revision, detail.widget]),
    recipient: onInstalled,
    mutationFn: (input: Parameters<WorkshopFeatureClient["customWidget"]["workshopInstall"]>[0], lease) =>
      client.customWidget.workshopInstall(input, { signal: lease.signal }),
    onSuccess: (result, lease) => {
      setup.clearSecrets();
      setOpened(false);
      void invalidate(lease);
      if (lease.isCurrent()) onInstalled?.(result.definitionId);
    },
  });
  const uncertain = install.isError && isAmbiguousWorkshopFailure(install.error);
  const disabled = held || readOnly || install.isPending || install.isSuccess || uncertain;
  const ready = setup.ready && Boolean(core.getImportReview(setup.configuredWidget)) && name.trim().length > 0;
  const confirmInstall = () => {
    if (disabled || !ready || !confirmed) return;
    install.mutate({
      submissionId: detail.submission.id,
      name: name.trim(),
      sources: setup.sources,
      secrets: setup.secrets,
    });
  };
  return (
    <>
      {renderPresentation(
        <Stack>
          {holdFeedback}
          <TextInput
            label="Installed widget name"
            value={name}
            maxLength={128}
            disabled={disabled}
            onChange={(event) => {
              setName(event.currentTarget.value);
              setConfirmed(false);
            }}
          />
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
          <Accordion variant="contained" radius="md">
            <Accordion.Item value="validated-template">
              <Accordion.Control>Inspect validated JSX template</Accordion.Control>
              <Accordion.Panel>
                <Code block style={{ maxHeight: "24rem", overflow: "auto" }}>
                  {detail.widget.template}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          {readOnly && <Alert color="yellow">Installation is disabled in this read-only session.</Alert>}
          {install.isError && <WorkshopFailure error={install.error} />}
          {uncertain && <WorkshopWriteOutcomeHold />}
          {install.data && (
            <Alert color="green" title="Widget installed">
              <Stack gap="xs">
                <Text>Saved definition: {install.data.definitionId}</Text>
                {install.data.missingCredentials.map(({ sourceId, kind }) => (
                  <Badge key={`${sourceId}:${kind}`} color="yellow">
                    {sourceId}: {kind} required
                  </Badge>
                ))}
              </Stack>
            </Alert>
          )}
          <Button
            disabled={disabled || !ready}
            onClick={() => {
              setConfirmed(false);
              setOpened(true);
            }}
          >
            Review installation
          </Button>
        </Stack>,
      )}
      <Modal
        opened={opened}
        onClose={() => {
          if (!install.isPending) setOpened(false);
        }}
        title="Install this community widget?"
        closeOnEscape={!install.isPending}
        closeOnClickOutside={!install.isPending}
        withCloseButton={!install.isPending}
      >
        <Stack>
          {holdFeedback}
          <WorkshopSecurityReview widget={setup.configuredWidget} />
          <Text size="sm">
            Installation creates a new local definition. Workshop is revalidated on the server; credentials and saved
            integration bindings are not published.
          </Text>
          <Checkbox
            checked={confirmed}
            disabled={disabled}
            label="I reviewed the sources, permissions, actions, and community warnings"
            onChange={(event) => setConfirmed(event.currentTarget.checked)}
          />
          {install.isError && <WorkshopFailure error={install.error} />}
          <Group justify="end">
            <Button variant="default" disabled={install.isPending} onClick={() => setOpened(false)}>
              Cancel installation
            </Button>
            <Button loading={install.isPending} disabled={disabled || !ready || !confirmed} onClick={confirmInstall}>
              Install widget
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
