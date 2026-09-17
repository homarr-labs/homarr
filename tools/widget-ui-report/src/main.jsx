import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const V1_STORAGE = "homarr-widget-review-v1";
const REVIEW_STORAGE = "homarr-widget-review-v2";
const OUTCOMES = ["improved", "acceptable", "needs-work"];
const OUTCOME_LABELS = { improved: "Improved", acceptable: "Acceptable / unchanged", "needs-work": "Needs work" };
const originalAudit = new URLSearchParams(location.search).get("audit") === "original";

function readStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {
    // Private browsing and malformed old values are handled as empty progress.
  }
  return {};
}

function route() {
  return decodeURIComponent(location.hash.replace(/^#\/widget\//, ""));
}

function asset(capture) {
  if (typeof capture === "string") return capture;
  return capture?.path;
}

function originalPath(path) {
  if (!path || path.startsWith("runs/original/")) return path;
  return `runs/original/${path.replace(/^\/+/, "")}`;
}

function prefixScreenshots(screenshots) {
  if (!screenshots) return screenshots;
  return Object.fromEntries(
    Object.entries(screenshots).map(([key, value]) => {
      if (typeof value === "string") return [key, originalPath(value)];
      if (!value?.path) return [key, value];
      return [key, { ...value, path: originalPath(value.path) }];
    }),
  );
}

function prefixOriginalManifest(manifest) {
  return {
    ...manifest,
    widgets: (manifest.widgets || []).map((widget) => ({
      ...widget,
      screenshots: Object.fromEntries(
        Object.entries(widget.screenshots || {}).map(([size, captures]) => [size, prefixScreenshots(captures)]),
      ),
    })),
    boards: (manifest.boards || []).map((board) => ({
      ...board,
      screenshots: prefixScreenshots(board.screenshots),
      screenshot: originalPath(board.screenshot),
    })),
  };
}

function legacyPath(path) {
  return path?.replace(/^runs\/original\//, "");
}

function captureOutcome(capture) {
  if (typeof capture !== "object" || !capture) return "unknown";
  return String(capture.captureOutcome || capture.outcome || capture.status || "unknown").toLowerCase();
}

function failedCapture(capture) {
  if (!capture || !asset(capture)) return true;
  return ["error", "failed", "missing", "timeout", "blocked", "unavailable"].includes(captureOutcome(capture));
}

function records(widget, manifest) {
  return (manifest?.sizes || []).flatMap((size) =>
    (manifest?.viewports || []).map((viewport) => ({
      key: `${widget.id}/${size}/${viewport.id}`,
      size,
      viewport,
      capture: widget.screenshots?.[size]?.[viewport.id],
    })),
  );
}

function comparisonRecords(widget, before, after, comparisons) {
  const beforeWidget = before?.widgets?.find((candidate) => candidate.id === widget.id);
  const afterWidget = after?.widgets?.find((candidate) => candidate.id === widget.id);
  const sizes = new Set([...(before?.sizes || []), ...(after?.sizes || [])]);
  const viewports = new Map(
    [...(before?.viewports || []), ...(after?.viewports || [])].map((value) => [value.id, value]),
  );
  return [...sizes].flatMap((size) =>
    [...viewports.values()].map((viewport) => {
      const key = `${widget.id}/${size}/${viewport.id}`;
      return {
        key,
        size,
        viewport,
        before: beforeWidget?.screenshots?.[size]?.[viewport.id],
        after: afterWidget?.screenshots?.[size]?.[viewport.id],
        comparison: comparisons.get(key),
      };
    }),
  );
}

function mergeWidgets(before, after) {
  const widgets = new Map();
  for (const widget of before?.widgets || []) widgets.set(widget.id, { ...widget });
  for (const widget of after?.widgets || []) widgets.set(widget.id, { ...widgets.get(widget.id), ...widget });
  return [...widgets.values()];
}

function validComparison(value) {
  if (!value?.before?.widgets || !value?.after?.widgets) return false;
  if (
    value.before.fixtureRevision &&
    value.after.fixtureRevision &&
    value.before.fixtureRevision !== value.after.fixtureRevision
  )
    return false;
  return true;
}

function runLabel(manifest) {
  if (manifest?.runId) return manifest.runId.slice(0, 8);
  return manifest?.generatedAt || manifest?.sourceRevision || "Unknown run";
}

function App() {
  const [manifest, setManifest] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState("");
  const [comparisonError, setComparisonError] = useState("");
  const [id, setId] = useState(route);
  const [saved, setSaved] = useState(() => readStorage(V1_STORAGE));
  const [reviews, setReviews] = useState(() => readStorage(REVIEW_STORAGE));
  const [storageError, setStorageError] = useState("");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewport, setViewport] = useState("");
  const [comparisonView, setComparisonView] = useState("side-by-side");

  useEffect(() => {
    const manifestPath = originalAudit ? "./runs/original/manifest.json" : "./manifest.json";
    fetch(manifestPath)
      .then((response) => {
        if (!response.ok) throw Error(`Report could not load (${response.status})`);
        return response.json();
      })
      .then((value) => setManifest(originalAudit ? prefixOriginalManifest(value) : value))
      .catch((loadError) => setError(loadError.message));
    if (!originalAudit) {
      fetch("./comparison.json")
        .then((response) => {
          if (response.status === 404) return null;
          if (!response.ok) throw Error(`Comparison could not load (${response.status})`);
          return response.json();
        })
        .then((value) => {
          if (!value) return;
          if (validComparison(value)) {
            setComparison({
              ...value,
              comparisons: new Map(
                (value.comparisons || []).map((entry) => [`${entry.widget}/${entry.size}/${entry.viewport}`, entry]),
              ),
            });
            return;
          }
          setComparisonError("Comparison data is incomplete or has mismatched fixtures; showing the current gallery.");
        })
        .catch((loadError) => setComparisonError(`${loadError.message}; showing the current gallery.`));
    }
    const change = () => {
      setId(route());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(V1_STORAGE, JSON.stringify(saved));
      setStorageError("");
    } catch {
      setStorageError(
        "Your browser could not save progress. Keep this tab open to retain this session’s confirmations.",
      );
    }
  }, [saved]);

  useEffect(() => {
    try {
      localStorage.setItem(REVIEW_STORAGE, JSON.stringify(reviews));
      setStorageError("");
    } catch {
      setStorageError(
        "Your browser could not save review outcomes. Keep this tab open to retain this session’s assessments.",
      );
    }
  }, [reviews]);

  const before = comparison?.before;
  const after = comparison?.after || manifest;
  const comparisonMode = Boolean(comparison);
  const widgets = useMemo(
    () => (comparisonMode ? mergeWidgets(before, after) : manifest?.widgets || []),
    [after, before, comparisonMode, manifest],
  );
  const comparisons = comparison?.comparisons || new Map();
  const runId = after?.runId || after?.sourceRevision || "current";
  const reviewRun = reviews[runId] || {};

  if (error)
    return (
      <main>
        <h1>Report unavailable</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Retry</button>
      </main>
    );
  if (!manifest || !after)
    return (
      <main>
        <p>Loading widget gallery…</p>
      </main>
    );

  const widget = widgets.find((candidate) => candidate.id === id);
  const currentManifest = comparisonMode ? after : manifest;
  const reviewed = (record) =>
    Boolean(
      saved[record.key] &&
      (saved[record.key].path === asset(record.capture) ||
        (originalAudit && saved[record.key].path === legacyPath(asset(record.capture)))),
    );
  const reviewIdentity = (record) => ({
    beforeHash: record.comparison?.beforeHash || asset(record.before) || "",
    afterHash: record.comparison?.afterHash || asset(record.after) || "",
  });
  const assessment = (record) => {
    const current = reviewRun[record.key];
    if (!current) return {};
    const identity = reviewIdentity(record);
    if (current.beforeHash !== identity.beforeHash || current.afterHash !== identity.afterHash) return {};
    const notComparable =
      record.comparison?.comparable !== true || failedCapture(record.before) || failedCapture(record.after);
    if (notComparable && current.outcome !== "needs-work") return { ...current, outcome: undefined };
    return current;
  };
  const outcome = (record) => assessment(record).outcome;
  const allRecords = (candidate) =>
    comparisonMode ? comparisonRecords(candidate, before, after, comparisons) : records(candidate, manifest);
  const totalFor = (candidate) => allRecords(candidate).length;
  const count = (candidate) =>
    allRecords(candidate).filter((record) => (comparisonMode ? Boolean(outcome(record)) : reviewed(record))).length;
  const changed = (candidate) => {
    if (!comparisonMode) return false;
    if (Array.isArray(after.changedWidgets)) return after.changedWidgets.includes(candidate.id);
    return allRecords(candidate).some((record) => record.comparison?.changed === true);
  };
  const failedBoard = (candidate) =>
    comparisonMode &&
    [before, after].some((run) =>
      run.boards?.some(
        (board) => board.widgets?.includes(candidate.id) && Object.values(board.screenshots || {}).some(failedCapture),
      ),
    );
  const failed = (candidate) =>
    comparisonMode &&
    (failedBoard(candidate) ||
      allRecords(candidate).some(
        (record) =>
          record.comparison?.comparable !== true || failedCapture(record.before) || failedCapture(record.after),
      ));
  const unreviewed = (candidate) => comparisonMode && allRecords(candidate).some((record) => !outcome(record));
  const needsWork = (candidate) =>
    comparisonMode && allRecords(candidate).some((record) => outcome(record) === "needs-work");
  const done = widgets.reduce((number, candidate) => number + count(candidate), 0);
  const maximum = widgets.reduce((number, candidate) => number + totalFor(candidate), 0);
  const toggle = (record, value) =>
    setSaved((previous) => {
      const next = { ...previous };
      if (value) next[record.key] = { path: asset(record.capture), confirmedAt: new Date().toISOString() };
      else delete next[record.key];
      return next;
    });
  const setReview = (record, value, note) =>
    setReviews((previous) => {
      const nextRun = { ...(previous[runId] || {}) };
      const notComparable =
        record.comparison?.comparable !== true || failedCapture(record.before) || failedCapture(record.after);
      const allowed = notComparable && value !== "needs-work" ? "" : value;
      const identity = reviewIdentity(record);
      if (!allowed && !note) delete nextRun[record.key];
      else
        nextRun[record.key] = {
          outcome: allowed || undefined,
          note: note || "",
          ...identity,
          updatedAt: new Date().toISOString(),
        };
      return { ...previous, [runId]: nextRun };
    });
  const link = (candidate) => `${originalAudit ? "?audit=original" : ""}#/widget/${encodeURIComponent(candidate.id)}`;
  const currentReportLink = `${location.pathname}${location.hash || "#/"}`;
  const all = widget ? allRecords(widget) : [];
  const visible = all.filter((record) => !viewport || record.viewport.id === viewport);
  const scrollTo = (record) =>
    record && document.getElementById(record.key)?.scrollIntoView({ behavior: "auto", block: "start" });
  const nextPending = visible.find((record) => (comparisonMode ? !outcome(record) : !reviewed(record)));
  const confirmNext = (record) => {
    toggle(record, true);
    const following = visible.slice(visible.indexOf(record) + 1).find((candidate) => !reviewed(candidate));
    const remaining = visible.find((candidate) => candidate.key !== record.key && !reviewed(candidate));
    if (following) scrollTo(following);
    else if (remaining) scrollTo(remaining);
  };
  const filtered = widgets.filter((candidate) => {
    const candidateCount = count(candidate);
    const candidateTotal = totalFor(candidate);
    if (family && family !== candidate.family) return false;
    if (filter === "pending" && candidateCount === candidateTotal) return false;
    if (filter === "complete" && candidateCount !== candidateTotal) return false;
    if (filter === "changed" && !changed(candidate)) return false;
    if (filter === "failed" && !failed(candidate)) return false;
    if (filter === "unreviewed" && !unreviewed(candidate)) return false;
    if (filter === "needs-work" && !needsWork(candidate)) return false;
    return `${candidate.name} ${candidate.id} ${candidate.family}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">
          Homarr <span>Widget review</span>
        </a>
        <div className="overall">
          <span>
            {done} / {maximum} {comparisonMode ? "assessed" : "confirmed"}
          </span>
          <progress value={done} max={maximum} />
        </div>
      </header>
      {storageError && (
        <p role="alert" className="notice">
          {storageError}
        </p>
      )}
      {comparisonError && (
        <p role="status" className="notice">
          {comparisonError}
        </p>
      )}
      {originalAudit && (
        <div className="original-banner">
          <strong>Historical original audit</strong>
          <span>Archived baseline captures from the original run. They are not matched comparison evidence.</span>
          <a href={currentReportLink}>Back to current comparison</a>
        </div>
      )}
      {comparisonMode && !widget && (
        <div className="comparison-banner">
          <strong>Before / after comparison</strong>
          <span>
            Before: {runLabel(before)} · After: {runLabel(after)}
          </span>
          <small>Assessments are saved for the after run. Existing v1 confirmations remain historical.</small>
        </div>
      )}
      {!widget && (
        <main>
          <div className="page-heading">
            <div>
              <h1>Widget gallery</h1>
              <p>
                {comparisonMode
                  ? "Compare matching captures and record the outcome for each after-run capture."
                  : "Choose a widget. Review every size. Pick up where you left off."}
              </p>
            </div>
            <span className="muted">
              {widgets.length} widgets · {currentManifest.sizes.length} sizes · {currentManifest.viewports.length}{" "}
              screens
            </span>
          </div>
          {comparisonMode && after.reviewSummary?.summary && <p className="notice">{after.reviewSummary.summary}</p>}
          {comparisonMode && (
            <p className="hint">
              <a href="?audit=original#/">Open original audit</a> ·{" "}
              <a href="runs/after/REVIEW.md">Read verification findings</a>
            </p>
          )}
          {comparisonMode && after.errors?.length > 0 && (
            <details className="notes">
              <summary>Capture diagnostics ({after.errors.length})</summary>
              <ul>
                {after.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
              <p>
                Failed dashboard context remains diagnostic evidence. Matching widget crops are assessed independently.
              </p>
            </details>
          )}
          {comparisonMode && after.reviewSummary?.diagnostics?.length > 0 && (
            <details className="notes">
              <summary>Retained diagnostics from earlier attempts</summary>
              <ul>
                {after.reviewSummary.diagnostics.map((diagnostic) => (
                  <li key={diagnostic.path}>
                    <a href={diagnostic.path} target="_blank" rel="noreferrer">
                      {diagnostic.label}
                    </a>
                    <p>{diagnostic.description}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {comparisonMode && after.reviewSummary?.limitations && (
            <details className="notes">
              <summary>Verification scope and limitations</summary>
              <ul>
                {after.reviewSummary.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="toolbar">
            <input
              aria-label="Search widgets"
              placeholder="Search widgets…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select aria-label="Widget family" value={family} onChange={(event) => setFamily(event.target.value)}>
              <option value="">All families</option>
              {[...new Set(widgets.map((candidate) => candidate.family))]
                .filter(Boolean)
                .sort()
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
            <select aria-label="Widget status" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All widgets</option>
              {!comparisonMode && (
                <>
                  <option value="pending">Still to review</option>
                  <option value="complete">Confirmed</option>
                </>
              )}
              {comparisonMode && (
                <>
                  <option value="changed">Changed widgets</option>
                  <option value="failed">Failed captures</option>
                  <option value="unreviewed">Unreviewed</option>
                  <option value="needs-work">Needs work</option>
                  <option value="complete">Fully assessed</option>
                </>
              )}
            </select>
          </div>
          <p className="hint">
            {comparisonMode
              ? "Comparison cards show only evidence present in the before and after manifests. Outcomes are scoped to the after run."
              : "Confirmations are saved in this browser. A confirmation records your review, not an automated quality check."}
          </p>
          <div className="gallery">
            {filtered.map((candidate) => {
              const candidateRecords = allRecords(candidate);
              const candidateCount = count(candidate);
              const previewRecord =
                candidateRecords.find((record) => asset(record.after)) ||
                candidateRecords.find((record) => asset(record.before));
              const preview = comparisonMode
                ? asset(previewRecord?.after || previewRecord?.before)
                : asset(candidate.screenshots?.["2x2"]?.[manifest.viewports[0].id]);
              return (
                <a className="widget-card" href={link(candidate)} key={candidate.id}>
                  <div className="thumbnail">
                    {preview && <img loading="lazy" src={preview} alt={`${candidate.name}, preview`} />}
                  </div>
                  <div className="card-body">
                    <small>{candidate.family}</small>
                    <h2>{candidate.name}</h2>
                    {comparisonMode && (
                      <div className="card-flags">
                        {changed(candidate) && <span>Changed</span>}
                        {failed(candidate) && <span className="flag-error">Capture issue</span>}
                      </div>
                    )}
                    <div className="card-progress">
                      <span>
                        {candidateCount} / {candidateRecords.length} {comparisonMode ? "assessed" : "confirmed"}
                      </span>
                      {candidateCount === candidateRecords.length && <b>✓ Complete</b>}
                    </div>
                    <progress value={candidateCount} max={candidateRecords.length} />
                  </div>
                </a>
              );
            })}
          </div>
          {!filtered.length && <p>No widgets match these filters.</p>}
        </main>
      )}
      {widget && (
        <main className="detail" key={widget.id}>
          <a className="back" href="#/">
            ← Widget gallery
          </a>
          <div className="page-heading">
            <div>
              <small>{widget.family}</small>
              <h1>{widget.name}</h1>
              <p>
                {count(widget)} / {totalFor(widget)} {comparisonMode ? "captures assessed" : "captures confirmed"}
              </p>
            </div>
            <div className="navigation">
              {widgets.indexOf(widget) > 0 && (
                <a className="button" href={link(widgets[widgets.indexOf(widget) - 1])}>
                  ← Previous widget
                </a>
              )}
              {widgets.indexOf(widget) < widgets.length - 1 && (
                <a className="button" href={link(widgets[widgets.indexOf(widget) + 1])}>
                  Next widget →
                </a>
              )}
            </div>
          </div>
          {comparisonMode && (
            <div className="comparison-meta">
              <span title={before.runId}>Before: {runLabel(before)}</span>
              <span title={after.runId}>After: {runLabel(after)}</span>
              <label>
                View{" "}
                <select value={comparisonView} onChange={(event) => setComparisonView(event.target.value)}>
                  <option value="side-by-side">Side by side</option>
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </select>
              </label>
            </div>
          )}
          {comparisonMode && after.reviewSummary?.widgets?.[widget.id] && (
            <p className="notice">{after.reviewSummary.widgets[widget.id]}</p>
          )}
          {!comparisonMode && widget.id === "notebook" && (
            <p className="notice">
              Review concern: at 1×1, the heading clips and the word-count footer overlaps the text.
            </p>
          )}
          {comparisonMode && failedBoard(widget) && (
            <p className="notice">
              This family has failed dashboard context. Open the board links below for diagnostics; the matching widget
              crops retain their own capture outcomes.
            </p>
          )}
          <details className="notes">
            <summary>Full dashboard context</summary>
            {comparisonMode && <BoardEvidence manifest={before} widgetId={widget.id} label="Before" />}
            <BoardEvidence manifest={currentManifest} widgetId={widget.id} label={comparisonMode ? "After" : "Audit"} />
          </details>
          <div className="review-controls">
            <label>
              Screen{" "}
              <select value={viewport} onChange={(event) => setViewport(event.target.value)}>
                <option value="">All screens</option>
                {currentManifest.viewports.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => nextPending && scrollTo(nextPending)} disabled={!nextPending}>
              Jump to next {comparisonMode ? "unreviewed" : "unconfirmed"}
            </button>
            <span className="muted">
              {visible.filter((record) => (comparisonMode ? outcome(record) : reviewed(record))).length} /{" "}
              {visible.length} in this view
            </span>
            <nav aria-label="Jump to size">
              {currentManifest.sizes.map((size) => (
                <button key={size} onClick={() => scrollTo(visible.find((record) => record.size === size))}>
                  {size.replace("x", "×")}
                </button>
              ))}
            </nav>
          </div>
          <div className="captures">
            {visible.map((record, index) => {
              if (!comparisonMode) {
                const path = asset(record.capture);
                return (
                  <article className="capture" id={record.key} key={record.key} data-confirmed={reviewed(record)}>
                    <div className="capture-heading">
                      <div>
                        <span className="size">{record.size.replace("x", "×")}</span>
                        <h2>{record.viewport.label}</h2>
                        <small>
                          {record.viewport.width} × {record.viewport.height} viewport · capture {index + 1} of{" "}
                          {visible.length}
                        </small>
                      </div>
                      <label className="confirm">
                        <input
                          type="checkbox"
                          checked={reviewed(record)}
                          disabled={!path}
                          onChange={(event) => toggle(record, event.target.checked)}
                        />{" "}
                        Confirmed
                      </label>
                    </div>
                    <div className="capture-image">
                      {path && (
                        <a href={path} target="_blank" rel="noreferrer" title="Open original screenshot">
                          <img
                            src={path}
                            loading="lazy"
                            alt={`${widget.name} at ${record.size} on ${record.viewport.label}`}
                          />
                        </a>
                      )}
                      {!path && <p>Screenshot missing — this capture cannot be confirmed.</p>}
                    </div>
                    <div className="capture-footer">
                      <span className="muted">
                        {reviewed(record)
                          ? "✓ Saved in this browser"
                          : "Inspect the capture, then confirm to continue."}
                      </span>
                      <button className="primary" disabled={!path} onClick={() => confirmNext(record)}>
                        Confirm & next ↓
                      </button>
                    </div>
                  </article>
                );
              }
              const current = assessment(record);
              const beforePath = asset(record.before);
              const afterPath = asset(record.after);
              const showBefore = comparisonView !== "after";
              const showAfter = comparisonView !== "before";
              const notComparable =
                record.comparison?.comparable !== true || failedCapture(record.before) || failedCapture(record.after);
              return (
                <article
                  className="capture comparison-capture"
                  id={record.key}
                  key={record.key}
                  data-outcome={current.outcome || "unreviewed"}
                >
                  <div className="capture-heading">
                    <div>
                      <span className="size">{record.size.replace("x", "×")}</span>
                      <h2>{record.viewport.label}</h2>
                      <small>
                        {record.viewport.width} × {record.viewport.height} viewport · capture {index + 1} of{" "}
                        {visible.length}
                      </small>
                    </div>
                    <span className={`outcome-badge outcome-${current.outcome || "unreviewed"}`}>
                      {OUTCOME_LABELS[current.outcome] || "Unreviewed"}
                    </span>
                  </div>
                  <div className={`comparison-images comparison-${comparisonView}`}>
                    {showBefore && <ComparisonImage label="Before" capture={record.before} path={beforePath} />}
                    {showAfter && <ComparisonImage label="After" capture={record.after} path={afterPath} />}
                  </div>
                  {notComparable && (
                    <p className="comparison-warning">
                      This pair is not comparable because the capture evidence failed. Only “Needs work” can be
                      recorded.
                    </p>
                  )}
                  <div className="assessment">
                    <label>
                      Outcome{" "}
                      <select
                        aria-label={`Outcome for ${record.size} ${record.viewport.label}`}
                        value={current.outcome || ""}
                        onChange={(event) => setReview(record, event.target.value, current.note)}
                      >
                        <option value="">Unreviewed</option>
                        {OUTCOMES.map((value) => (
                          <option key={value} value={value} disabled={notComparable && value !== "needs-work"}>
                            {OUTCOME_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="note-label">
                      Note{" "}
                      <textarea
                        aria-label={`Note for ${record.size} ${record.viewport.label}`}
                        rows="2"
                        placeholder="Optional note"
                        value={current.note || ""}
                        onChange={(event) => setReview(record, current.outcome, event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="capture-footer">
                    <span className="muted">
                      {notComparable
                        ? "Diagnostic evidence is not comparable"
                        : record.comparison?.changed
                          ? "Matching before and after evidence changed"
                          : "No recorded change in the comparison evidence"}
                    </span>
                    <button
                      className="primary"
                      disabled={!visible.slice(visible.indexOf(record) + 1).find((candidate) => !outcome(candidate))}
                      onClick={() =>
                        scrollTo(visible.slice(visible.indexOf(record) + 1).find((candidate) => !outcome(candidate)))
                      }
                    >
                      Save & next ↓
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {count(widget) === totalFor(widget) && (
            <p className="complete-message">✓ All captures assessed for {widget.name}.</p>
          )}
          <details className="notes">
            <summary>
              {comparisonMode
                ? "Historical original-audit observations"
                : "Family observations and capture limitations"}
            </summary>
            <pre>
              {currentManifest.reviews?.find((review) => review.family === widget.family)?.notes ||
                currentManifest.methodology}
            </pre>
          </details>
          <a className="button" href="#/">
            Back to gallery
          </a>
        </main>
      )}
    </>
  );
}

function BoardEvidence({ manifest, widgetId, label }) {
  const board = manifest.boards?.find((entry) => entry.widgets?.includes(widgetId));
  if (!board) return null;
  return (
    <p>
      {label}:{" "}
      {manifest.viewports.map((viewport) => {
        const path = asset(board.screenshots?.[viewport.id]);
        if (!path) return null;
        return (
          <a key={viewport.id} href={path} target="_blank" rel="noreferrer" style={{ marginInlineEnd: 16 }}>
            {viewport.label} · {captureOutcome(board.screenshots?.[viewport.id])}
          </a>
        );
      })}
    </p>
  );
}

function ComparisonImage({ label, capture, path }) {
  const status = captureOutcome(capture);
  return (
    <figure className="comparison-image">
      <figcaption>
        <strong>{label}</strong>
        <span className={failedCapture(capture) ? "capture-status status-error" : "capture-status"}>{status}</span>
      </figcaption>
      {path && (
        <a href={path} target="_blank" rel="noreferrer" title={`Open ${label.toLowerCase()} screenshot`}>
          <img src={path} loading="lazy" alt={`${label} widget capture`} />
        </a>
      )}
      {!path && <p>No {label.toLowerCase()} capture in this comparison.</p>}
    </figure>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
