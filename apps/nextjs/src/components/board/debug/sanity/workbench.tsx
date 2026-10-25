"use client";

import { useRef, useState } from "react";
import { Alert, Badge, Button, FileButton, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconFlask, IconUpload } from "@tabler/icons-react";

import { maxSanityReportBytes, parseSanityReport } from "@homarr/boards/sanity-report";
import type { SanityIdentity, SanityReport, SanityScenario } from "@homarr/boards/sanity-report";

import { ScenarioEvidence } from "./evidence";
import classes from "./workbench.module.css";

function ScenarioStatus({ scenario }: { scenario: SanityScenario | undefined }) {
  if (
    !scenario ||
    scenario.before.status === "error" ||
    scenario.after.status === "error" ||
    !scenario.before.image ||
    !scenario.after.image ||
    scenario.before.checks.length === 0 ||
    scenario.after.checks.length === 0
  ) {
    return (
      <Badge size="xs" color="orange" variant="light">
        Incomplete
      </Badge>
    );
  }
  if (scenario.after.checks.some((check) => check.status === "failed")) {
    return (
      <Badge size="xs" color="red" variant="light">
        Failed
      </Badge>
    );
  }
  return (
    <Badge size="xs" color="teal" variant="light">
      Passed
    </Badge>
  );
}

function RunStatus({ report }: { report: SanityReport }) {
  let color = "teal";
  let title = "Candidate assertions passed · visual review pending";
  let detail = "An independent reviewer must explain visual changes before this evidence is accepted.";
  if (report.deterministicStatus === "failed") {
    color = "red";
    title = "Candidate assertions failed";
    detail = "A behavior contract failed. Appearance review cannot override this result.";
  } else if (report.deterministicStatus === "blocked") {
    color = "orange";
    title = "Run incomplete";
    detail = "Resolve missing evidence, run errors, or unmapped changes before this run can support a release.";
  }
  return (
    <Alert color={color} title={title}>
      {detail}
    </Alert>
  );
}

function Identity({ title, identity }: { title: string; identity: SanityIdentity }) {
  return (
    <div>
      <Text fw={600} size="sm">
        {title} · {identity.label}
      </Text>
      <dl className={classes.provenance}>
        <dt>Source</dt>
        <dd>{identity.sourceSha}</dd>
        {identity.sourceVerification && (
          <>
            <dt>Source verification</dt>
            <dd>{identity.sourceVerification}</dd>
          </>
        )}
        {identity.imageDigest && (
          <>
            <dt>Image</dt>
            <dd>{identity.imageDigest}</dd>
          </>
        )}
        {identity.url && (
          <>
            <dt>Instance</dt>
            <dd>{identity.url}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

function Provenance({ report }: { report: SanityReport }) {
  return (
    <Paper withBorder p="md">
      <details>
        <summary className={classes.summary}>Run provenance</summary>
        <Stack gap="md" mt="md">
          <div className={classes.capturePair}>
            <Identity title="Before" identity={report.base} />
            <Identity title="After" identity={report.candidate} />
          </div>
          <dl className={classes.provenance}>
            <dt>Run</dt>
            <dd>{report.runId}</dd>
            <dt>Captured</dt>
            <dd>{report.createdAt}</dd>
            <dt>Mode</dt>
            <dd>{report.mode}</dd>
            <dt>Fixture</dt>
            <dd>{report.fixture.id}</dd>
            <dt>Fixture SHA-256</dt>
            <dd>{report.fixture.sha256}</dd>
            <dt>Browser</dt>
            <dd>Chromium {report.browser.version} · Linux</dd>
            <dt>Startup</dt>
            <dd>{(report.timings.startupMs / 1000).toFixed(1)} seconds</dd>
            <dt>Checks</dt>
            <dd>{(report.timings.checksMs / 1000).toFixed(1)} seconds</dd>
          </dl>
          {report.selection.coverageDecisions && report.selection.coverageDecisions.length > 0 && (
            <div>
              <Text fw={600} size="sm">
                Explicit coverage decisions
              </Text>
              <ul className={classes.reasonList}>
                {report.selection.coverageDecisions.map((decision) => (
                  <li key={decision.path}>
                    <strong>{decision.path}</strong>: {decision.reason}
                    <br />
                    Source blob: {decision.blobSha}
                    <br />
                    Selected: {decision.scenarios.join(", ") || "No additional scenarios"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Text size="xs" c="dimmed">
            Provenance is recorded by the runner. Loading a report does not approve a release.
          </Text>
        </Stack>
      </details>
    </Paper>
  );
}

function LoadedReport({ report }: { report: SanityReport }) {
  const [selectedId, setSelectedId] = useState(report.selection.scenarios[0]?.id);
  const scenario = report.scenarios.find((entry) => entry.id === selectedId);
  const selection = report.selection.scenarios.find((entry) => entry.id === selectedId);
  const coverageDecisions =
    report.selection.coverageDecisions?.filter((decision) => decision.scenarios.includes(selectedId ?? "")) ?? [];
  return (
    <Stack gap="lg">
      <RunStatus report={report} />
      {report.selection.unmappedPaths.length > 0 && (
        <Alert color="orange" title="Coverage decision required">
          These changed paths are not mapped to checks:
          <ul className={classes.pathList}>
            {report.selection.unmappedPaths.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </Alert>
      )}
      <div className={classes.workspace}>
        <Paper withBorder className={classes.sidebar} component="nav" aria-label="Selected sanity checks">
          <div className={classes.sidebarHeading}>
            <Text size="sm" fw={600}>
              Selected checks
            </Text>
            <Text size="xs" c="dimmed">
              {report.selection.scenarios.length} scenarios · candidate results
            </Text>
          </div>
          {report.selection.scenarios.map((selected) => {
            const result = report.scenarios.find((entry) => entry.id === selected.id);
            return (
              <button
                key={selected.id}
                type="button"
                className={classes.scenarioButton}
                aria-pressed={selected.id === selectedId}
                onClick={() => setSelectedId(selected.id)}
              >
                <span>
                  <strong>{result?.title ?? selected.id}</strong>
                  {result && (
                    <small>
                      {result.viewport.width} × {result.viewport.height}px
                    </small>
                  )}
                </span>
                <ScenarioStatus scenario={result} />
              </button>
            );
          })}
          {selection && (
            <div className={classes.sidebarHeading}>
              <Text size="xs" fw={600}>
                Why this check?
              </Text>
              <ul className={classes.reasonList}>
                {selection.reasons.slice(0, 3).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {selection.reasons.length > 3 && (
                <details className={classes.moreReasons}>
                  <summary>{selection.reasons.length - 3} more selection reasons</summary>
                  <ul className={classes.reasonList}>
                    {selection.reasons.slice(3).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </details>
              )}
              {coverageDecisions.length > 0 && (
                <>
                  <Text size="xs" fw={600} mt="md">
                    Explicit coverage
                  </Text>
                  <ul className={classes.reasonList}>
                    {coverageDecisions.map((decision) => (
                      <li key={decision.path}>
                        {decision.path}: {decision.reason}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </Paper>
        <Stack gap="md" className={classes.main}>
          {scenario && (
            <>
              <Group justify="space-between" align="flex-start">
                <div>
                  <Title order={2} size="h3">
                    {scenario.title}
                  </Title>
                  <Text size="sm" c="dimmed" mt={4}>
                    Same fixture and viewport on both pinned versions.
                  </Text>
                </div>
                <Badge color="orange" variant="light">
                  Visual review pending
                </Badge>
              </Group>
              <ScenarioEvidence key={scenario.id} scenario={scenario} report={report} />
            </>
          )}
          {!scenario && (
            <Alert color="orange" title="Evidence missing">
              No recorded result is available for the selected check.
            </Alert>
          )}
          <Provenance report={report} />
        </Stack>
      </div>
    </Stack>
  );
}

export function BoardSanityWorkbench() {
  const [report, setReport] = useState<SanityReport | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetFileRef = useRef<() => void>(null);
  const loadSequence = useRef(0);

  const upload = async (file: File | null) => {
    resetFileRef.current?.();
    if (!file) return;
    const sequence = ++loadSequence.current;
    setReport(null);
    setFilename(null);
    setError(null);
    if (file.size > maxSanityReportBytes) {
      setError("The report exceeds the 30 MiB limit.");
      return;
    }
    setLoading(true);
    try {
      const result = parseSanityReport(await file.text());
      if (sequence !== loadSequence.current) return;
      setReport(result);
      setFilename(file.name);
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      let message = "This file is not a valid version 1 Homarr sanity report.";
      if (cause instanceof Error) message = cause.message;
      setError(message);
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  };

  const clear = () => {
    loadSequence.current++;
    setReport(null);
    setFilename(null);
    setError(null);
    setLoading(false);
    resetFileRef.current?.();
  };

  return (
    <Stack className={classes.root} gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs">
          <Button
            component="a"
            href="/debug/board"
            variant="subtle"
            color="gray"
            size="xs"
            w="fit-content"
            leftSection={<IconArrowLeft size={14} />}
          >
            Board playground
          </Button>
          <Group gap="xs">
            <IconFlask size={25} aria-hidden />
            <Title order={1} size="h2">
              Board sanity workbench
            </Title>
            <Badge color="orange">Developer tool</Badge>
          </Group>
          <Text c="dimmed" size="sm">
            Compare targeted checks on pinned before and after versions.
          </Text>
        </Stack>
        <Group>
          <FileButton
            accept="application/json,.json"
            onChange={(file) => void upload(file)}
            resetRef={resetFileRef}
            disabled={loading}
          >
            {(props) => (
              <Button {...props} loading={loading} leftSection={<IconUpload size={16} />}>
                Load report
              </Button>
            )}
          </FileButton>
          {report && (
            <Button variant="default" onClick={clear}>
              Clear report
            </Button>
          )}
        </Group>
      </Group>
      {error && (
        <Alert color="red" role="alert" title="Unable to load report">
          {error}
        </Alert>
      )}
      {filename && (
        <Text size="xs" c="dimmed" className={classes.filename}>
          {filename} · stays in this browser tab
        </Text>
      )}
      {!report && !loading && (
        <Paper withBorder p="xl">
          <Stack align="center" py="xl" gap="sm">
            <IconUpload size={36} aria-hidden />
            <Title order={2} size="h3">
              Load a sanity report
            </Title>
            <Text c="dimmed" ta="center" maw={520}>
              Open the JSON produced by the targeted board sanity runner. Review selected scenarios, recorded
              screenshots, behavior checks, and the exact versions used by the run.
            </Text>
            <Text size="xs" c="dimmed">
              Reports are read locally. No instance is changed by this workbench.
            </Text>
          </Stack>
        </Paper>
      )}
      {report && <LoadedReport key={report.runId} report={report} />}
    </Stack>
  );
}
