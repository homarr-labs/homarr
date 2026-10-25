"use client";

import { useRef, useState } from "react";
import { Alert, Button, FileButton, Group, NativeSelect, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconCircleDashed, IconFileAnalytics, IconUpload, IconX } from "@tabler/icons-react";

import { maxSanityReportBytes, parseSanityReport } from "@homarr/boards/sanity-report";
import type { SanityIdentity, SanityReport, SanityScenario } from "@homarr/boards/sanity-report";

import { ScenarioEvidence } from "./evidence";
import classes from "./workbench.module.css";

function getScenarioStatus(scenario: SanityScenario | undefined) {
  let state = "passed";
  let label = "Passed";
  let Icon = IconCheck;
  if (
    !scenario ||
    scenario.before.status === "error" ||
    scenario.after.status === "error" ||
    !scenario.before.image ||
    !scenario.after.image ||
    scenario.before.checks.length === 0 ||
    scenario.after.checks.length === 0
  ) {
    state = "incomplete";
    label = "Incomplete";
    Icon = IconCircleDashed;
  } else if (scenario.after.checks.some((check) => check.status === "failed")) {
    state = "failed";
    label = "Failed";
    Icon = IconX;
  }
  return { state, label, Icon };
}

function ScenarioStatus({ scenario }: { scenario: SanityScenario | undefined }) {
  const { state, label, Icon } = getScenarioStatus(scenario);
  return (
    <span className={classes.status} data-state={state}>
      <Icon size={15} aria-hidden />
      {label}
    </span>
  );
}

function RunStatus({ report }: { report: SanityReport }) {
  let title = "Candidate checks passed";
  let detail = "An independent reviewer must explain visual changes before this evidence is accepted.";
  let Icon = IconCheck;
  if (report.selection.scenarios.length === 0) title = "No board checks selected";
  if (report.deterministicStatus === "failed") {
    title = "Candidate checks failed";
    detail = "A behavior contract failed. Appearance review cannot override this result.";
    Icon = IconX;
  } else if (report.deterministicStatus === "blocked") {
    title = "Run incomplete";
    detail = "Resolve missing evidence, run errors, or unmapped changes before this run can support a release.";
    Icon = IconCircleDashed;
  }
  const passed = report.scenarios.reduce(
    (count, scenario) => count + scenario.after.checks.filter((check) => check.status === "passed").length,
    0,
  );
  const total = report.scenarios.reduce((count, scenario) => count + scenario.after.checks.length, 0);
  return (
    <section className={classes.runStatus} data-state={report.deterministicStatus} aria-label="Run result">
      <div className={classes.runVerdict}>
        <Icon size={20} aria-hidden />
        <div>
          <Text fw={600}>{title}</Text>
          {report.deterministicStatus === "passed" && (
            <details className={classes.verdictDetails}>
              <summary>Independent visual review required</summary>
              <Text size="sm" className={classes.muted}>
                {detail}
              </Text>
            </details>
          )}
          {report.deterministicStatus !== "passed" && (
            <Text size="sm" className={classes.muted}>
              {detail}
            </Text>
          )}
        </div>
      </div>
      <dl className={classes.runMetrics}>
        <div>
          <dt>Candidate checks</dt>
          <dd>
            {passed}
            <span> / {total}</span>
          </dd>
        </div>
        <div>
          <dt>Check time</dt>
          <dd>
            {(report.timings.checksMs / 1000).toFixed(1)}
            <span> seconds</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Identity({ title, identity }: { title: string; identity: SanityIdentity }) {
  return (
    <div>
      <Text fw={600} size="sm">
        {title}: {identity.label}
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
    <section className={classes.provenanceSection}>
      <details>
        <summary className={classes.summary}>Run provenance and coverage</summary>
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
            <dd>Chromium {report.browser.version} on Linux</dd>
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
    </section>
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
        <nav className={classes.sidebar} aria-label="Selected sanity checks">
          <div className={classes.sidebarHeading}>
            <Text fw={600} size="sm">
              Scenarios
            </Text>
            <Text size="sm" className={classes.muted}>
              {report.selection.scenarios.length} selected
            </Text>
          </div>
          {report.selection.scenarios.length > 0 && (
            <NativeSelect
              className={classes.mobileScenario}
              label="Scenario"
              value={selectedId ?? ""}
              onChange={(event) => setSelectedId(event.currentTarget.value)}
              data={report.selection.scenarios.map((selected) => {
                const result = report.scenarios.find((entry) => entry.id === selected.id);
                const { label } = getScenarioStatus(result);
                return { value: selected.id, label: `${result?.title ?? selected.id} (${label.toLowerCase()})` };
              })}
            />
          )}
          <div className={classes.scenarioList}>
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
                  <strong>{result?.title ?? selected.id}</strong>
                  <span className={classes.scenarioMeta}>
                    {result && (
                      <small>
                        {result.viewport.width} × {result.viewport.height}px
                      </small>
                    )}
                    <ScenarioStatus scenario={result} />
                  </span>
                </button>
              );
            })}
          </div>
          {selection && (
            <details className={classes.selectionDetails}>
              <summary className={classes.summary}>Why this check?</summary>
              <ul className={classes.reasonList}>
                {selection.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {coverageDecisions.length > 0 && (
                <>
                  <Text size="sm" fw={600} mt="md">
                    Coverage decisions
                  </Text>
                  <ul className={classes.reasonList}>
                    {coverageDecisions.map((decision) => (
                      <li key={decision.path}>
                        <strong>{decision.path}</strong>: {decision.reason}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </details>
          )}
        </nav>
        <main className={classes.main} id="sanity-comparison">
          {scenario && (
            <>
              <header className={classes.scenarioHeading}>
                <div>
                  <Title order={2} size="h3">
                    {scenario.title}
                  </Title>
                  <Text size="sm" className={classes.muted}>
                    Same fixture and viewport on both pinned versions.
                  </Text>
                </div>
                <span className={classes.reviewPending}>
                  <IconCircleDashed size={16} aria-hidden />
                  Visual review pending
                </span>
              </header>
              <ScenarioEvidence key={scenario.id} scenario={scenario} report={report} />
            </>
          )}
          {!scenario && report.selection.scenarios.length > 0 && (
            <Alert color="orange" title="Evidence missing">
              No recorded result is available for the selected check.
            </Alert>
          )}
          {report.selection.scenarios.length === 0 && (
            <Text className={classes.muted}>
              This report selected no board scenarios. Review its coverage decisions below.
            </Text>
          )}
          <Provenance report={report} />
        </main>
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
    <div className={classes.root} data-sanity-workbench data-has-report={Boolean(report)}>
      <a className={classes.skipLink} href="#sanity-comparison">
        Skip to comparison
      </a>
      <header className={classes.header}>
        <div className={classes.headerTitle}>
          <Button
            component="a"
            href="/debug/board"
            variant="subtle"
            color="gray"
            size="compact-sm"
            className={classes.backLink}
            leftSection={<IconArrowLeft size={15} aria-hidden />}
          >
            Board playground
          </Button>
          <Title order={1} size="h2">
            Board sanity workbench
          </Title>
          <Text size="sm" className={classes.muted}>
            Compare targeted checks on pinned before and after versions.
          </Text>
        </div>
        <Group gap="sm" className={classes.headerActions}>
          {report && (
            <Button variant="subtle" color="gray" onClick={clear}>
              Clear report
            </Button>
          )}
          <FileButton
            accept="application/json,.json"
            onChange={(file) => void upload(file)}
            resetRef={resetFileRef}
            disabled={loading}
          >
            {(props) => (
              <Button
                {...props}
                loading={loading}
                leftSection={<IconUpload size={16} aria-hidden />}
                className={classes.primaryAction}
              >
                Load report
              </Button>
            )}
          </FileButton>
        </Group>
      </header>
      {error && (
        <Alert color="red" role="alert" title="Unable to load report" mb="lg" className={classes.errorAlert}>
          {error}
        </Alert>
      )}
      {filename && (
        <section className={classes.fileBar} aria-label="Loaded report">
          <IconFileAnalytics size={16} aria-hidden />
          <Text size="sm" className={classes.filename}>
            {filename}
          </Text>
          <Text size="sm" className={classes.muted}>
            Stays in this browser tab
          </Text>
        </section>
      )}
      {!report && !loading && (
        <main className={classes.emptyState} id="sanity-comparison">
          <div className={classes.emptyIntro}>
            <IconFileAnalytics size={36} stroke={1.5} aria-hidden />
            <Title order={2}>Load a sanity report</Title>
            <Text className={classes.muted}>Open the JSON produced by the targeted board sanity runner.</Text>
            <Text size="sm" className={classes.localNotice}>
              Reports are read locally. No instance is changed by this workbench.
            </Text>
          </div>
          <dl className={classes.emptyGuide}>
            <div>
              <dt>Compare the captures</dt>
              <dd>See before and after screenshots for each selected scenario.</dd>
            </div>
            <div>
              <dt>Check the behavior</dt>
              <dd>Review recorded assertions and inspect any failures.</dd>
            </div>
            <div>
              <dt>Verify the versions</dt>
              <dd>Inspect the exact source, image, and fixture used by the run.</dd>
            </div>
          </dl>
        </main>
      )}
      {loading && (
        <output className={classes.loadingState} aria-live="polite">
          <Text>Reading report…</Text>
        </output>
      )}
      {report && <LoadedReport key={report.runId} report={report} />}
    </div>
  );
}
