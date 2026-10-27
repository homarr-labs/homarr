"use client";

import { useState } from "react";
import { Alert, Tabs } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconChevronDown, IconX } from "@tabler/icons-react";

import type {
  SanityCapture,
  SanityCheck,
  SanityIdentity,
  SanityReport,
  SanityScenario,
} from "@homarr/boards/sanity-report";

import { SnapshotInspector } from "./snapshot-inspector";
import classes from "./workbench.module.css";

function Capture({
  capture,
  label,
  scenario,
  identity,
}: {
  capture: SanityCapture;
  label: string;
  scenario: SanityScenario;
  identity: SanityIdentity;
}) {
  const [imageError, setImageError] = useState(false);
  return (
    <div>
      <figure className={classes.capture}>
        <figcaption className={classes.captureHeading}>
          <span>{label}</span>
          <span className={classes.captureMeta}>
            {scenario.viewport.width} × {scenario.viewport.height}px viewport
          </span>
        </figcaption>
        <div className={classes.imageStage}>
          {capture.image && !imageError && (
            <img
              src={capture.image}
              width={scenario.viewport.width}
              height={scenario.viewport.height}
              alt={`${label}: ${scenario.title}`}
              className={classes.captureImage}
              onError={() => setImageError(true)}
            />
          )}
          {!capture.image && <p className={classes.captureError}>No screenshot was captured.</p>}
          {imageError && (
            <p className={classes.captureError} role="alert">
              The captured PNG could not be decoded.
            </p>
          )}
        </div>
        <div className={classes.captureBuild}>
          <span>{identity.label}</span>
          <code title={identity.sourceSha}>{identity.sourceSha.slice(0, 12)}</code>
        </div>
      </figure>
      {capture.error && (
        <Alert color="red" title={`${label} run error`} className={classes.captureError}>
          {capture.error}
        </Alert>
      )}
      {capture.snapshot && <SnapshotInspector text={capture.snapshot} label={label} />}
    </div>
  );
}

function Difference({ scenario }: { scenario: SanityScenario }) {
  const [beforeDimensions, setBeforeDimensions] = useState<string | null>(null);
  const [afterDimensions, setAfterDimensions] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  if (!scenario.before.image || !scenario.after.image) {
    return <Alert color="orange">Both captures are required to display their difference.</Alert>;
  }
  if (imageError) return <Alert color="orange">A captured PNG could not be decoded.</Alert>;
  if (beforeDimensions && afterDimensions && beforeDimensions !== afterDimensions) {
    return (
      <Alert color="orange" title="Capture dimensions changed">
        Before is {beforeDimensions}px; after is {afterDimensions}px. Use the before / after view to inspect overflow. A
        difference overlay requires matching image dimensions.
      </Alert>
    );
  }
  return (
    <div>
      <figure className={classes.capture}>
        <figcaption className={classes.captureHeading}>
          <span>Difference overlay</span>
          <span className={classes.captureMeta}>
            {scenario.viewport.width} × {scenario.viewport.height}px viewport
          </span>
        </figcaption>
        <div className={classes.difference} data-ready={Boolean(beforeDimensions && afterDimensions)}>
          <img
            src={scenario.before.image}
            width={scenario.viewport.width}
            height={scenario.viewport.height}
            alt={`Before: ${scenario.title}`}
            className={classes.captureImage}
            onLoad={(event) =>
              setBeforeDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)
            }
            onError={() => setImageError(true)}
          />
          <img
            src={scenario.after.image}
            width={scenario.viewport.width}
            height={scenario.viewport.height}
            alt={`After: ${scenario.title}, overlaid with difference blending`}
            className={classes.differenceImage}
            onLoad={(event) =>
              setAfterDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)
            }
            onError={() => setImageError(true)}
          />
        </div>
      </figure>
      <p className={classes.captureMeta}>
        Black areas match. Colored areas changed. This overlay helps inspect the supplied captures; it does not decide
        whether a change is acceptable.
      </p>
    </div>
  );
}

function CheckStatus({ check, label }: { check: SanityCheck | undefined; label: string }) {
  let status = "missing";
  let description = "not recorded";
  let Icon = IconAlertTriangle;
  if (check?.status === "passed") {
    status = "passed";
    description = "passed";
    Icon = IconCheck;
  } else if (check?.status === "failed") {
    status = "failed";
    description = "failed";
    Icon = IconX;
  }
  return (
    <span className={classes.checkStatus} data-status={status}>
      <Icon size={15} stroke={1.8} aria-hidden />
      <span>
        {label} {description}
      </span>
    </span>
  );
}

function CheckValue({ check, label }: { check: SanityCheck | undefined; label: string }) {
  return (
    <div className={classes.checkValue}>
      <h4 className={classes.checkValueTitle}>{label}</h4>
      {check && (
        <dl className={classes.checkDetail}>
          <dt>Expected</dt>
          <dd>{check.expected}</dd>
          <dt>Observed</dt>
          <dd>{check.observed}</dd>
        </dl>
      )}
      {!check && <p className={classes.captureMeta}>No result was recorded for this version.</p>}
    </div>
  );
}

export function ScenarioEvidence({ scenario, report }: { scenario: SanityScenario; report: SanityReport }) {
  const beforeChecks = new Map(scenario.before.checks.map((check) => [check.id, check]));
  const afterChecks = new Map(scenario.after.checks.map((check) => [check.id, check]));
  const checkIds = [...new Set([...afterChecks.keys(), ...beforeChecks.keys()])];
  return (
    <div className={classes.evidence}>
      <Tabs defaultValue="pair" keepMounted={false}>
        <Tabs.List aria-label="Recorded evidence view" className={classes.evidenceToolbar}>
          <Tabs.Tab value="pair">Before / after</Tabs.Tab>
          <Tabs.Tab value="difference">Difference</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="pair">
          <div className={classes.capturePair}>
            <Capture capture={scenario.before} label="Before" scenario={scenario} identity={report.base} />
            <Capture capture={scenario.after} label="After" scenario={scenario} identity={report.candidate} />
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="difference">
          <Difference scenario={scenario} />
        </Tabs.Panel>
      </Tabs>
      <section className={classes.checkSection} aria-label="Behavior checks">
        <div className={classes.evidenceToolbar}>
          <h3>Behavior checks</h3>
          <span className={classes.checkCount}>{checkIds.length} checks</span>
        </div>
        {checkIds.length === 0 && <p className={classes.captureMeta}>No assertions were recorded for this scenario.</p>}
        {checkIds.length > 0 && (
          <div className={classes.checkList}>
            {checkIds.map((id) => {
              const before = beforeChecks.get(id);
              const after = afterChecks.get(id);
              const needsAttention = before?.status !== "passed" || after?.status !== "passed";
              return (
                <details key={id} className={classes.checkRow} open={needsAttention} data-attention={needsAttention}>
                  <summary className={classes.checkSummary}>
                    <span className={classes.checkLabel}>{after?.label ?? before?.label}</span>
                    <span className={classes.checkStatuses}>
                      <CheckStatus check={before} label="Baseline" />
                      <CheckStatus check={after} label="Candidate" />
                    </span>
                    <IconChevronDown size={16} stroke={1.8} aria-hidden />
                  </summary>
                  <div className={classes.checkValues}>
                    <CheckValue check={before} label="Baseline" />
                    <CheckValue check={after} label="Candidate" />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
