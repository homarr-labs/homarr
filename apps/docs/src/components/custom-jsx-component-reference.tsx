import BrowserOnly from "@docusaurus/BrowserOnly";
import useBaseUrl from "@docusaurus/useBaseUrl";
import { useEffect, useMemo, useState } from "react";

import { buildCustomJsxComponentUsageExample } from "@homarr/custom-widgets/catalog-example";
import type {
  CustomJsxAuthoringCatalog,
  CustomJsxComponentApi,
  CustomJsxPropDescriptor,
} from "@homarr/custom-widgets/catalog";

import { CustomWidgetCodeExample } from "./custom-widget-code";
import styles from "./custom-jsx-component-reference.module.css";

type ComponentCatalog = CustomJsxAuthoringCatalog;
type CatalogComponent = CustomJsxComponentApi;
type CatalogProp = CustomJsxPropDescriptor;

const PAGE_SIZE = 40;

export function CustomJsxComponentReference() {
  return (
    <BrowserOnly fallback={<ComponentReferenceFallback />}>{() => <CustomJsxComponentReferenceClient />}</BrowserOnly>
  );
}

function ComponentReferenceFallback() {
  return (
    <div className={styles.loading} aria-busy="true">
      Loading the Custom JSX component catalog…
    </div>
  );
}

function CustomJsxComponentReferenceClient() {
  const catalogUrl = useBaseUrl("/custom-widgets/component-catalog-v1.json");
  const [catalog, setCatalog] = useState<ComponentCatalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [safetyFilter, setSafetyFilter] = useState("available");
  const [bindableOnly, setBindableOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [showGlobalProps, setShowGlobalProps] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(null);

    void fetch(catalogUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`The catalog request returned HTTP ${response.status}.`);
        return (await response.json()) as ComponentCatalog;
      })
      .then((value) => {
        if (!Array.isArray(value.components) || !Array.isArray(value.types) || !Array.isArray(value.globalProps)) {
          throw new Error("The catalog response has an unsupported shape.");
        }
        setCatalog(value);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "The component catalog could not be loaded.");
      });

    return () => controller.abort();
  }, [catalogUrl]);

  const categories = useMemo(
    () => [...new Set(catalog?.components.map((component) => component.category) ?? [])].sort(),
    [catalog],
  );
  const packages = useMemo(
    () => [...new Set(catalog?.components.map((component) => component.package) ?? [])].sort(),
    [catalog],
  );
  const filteredComponents = useMemo(() => {
    if (!catalog) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return catalog.components.filter((component) => {
      if (packageFilter !== "all" && component.package !== packageFilter) return false;
      if (categoryFilter !== "all" && component.category !== categoryFilter) return false;
      if (safetyFilter === "available" && component.safety === "denied") return false;
      if (safetyFilter !== "all" && safetyFilter !== "available" && component.safety !== safetyFilter) return false;
      if (bindableOnly && !component.bind) return false;
      if (!normalizedQuery) return true;

      return [
        component.name,
        component.package,
        component.category,
        component.description,
        component.deniedReason,
        ...component.subcomponents,
        ...component.props.map((prop) => prop.name),
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [bindableOnly, catalog, categoryFilter, packageFilter, query, safetyFilter]);
  const visibleComponents = filteredComponents.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [bindableOnly, categoryFilter, packageFilter, query, safetyFilter]);

  useEffect(() => {
    if (!catalog) return;

    const revealHashTarget = () => {
      const hash = decodeLocationHash(window.location.hash);
      const component = catalog.components.find((entry) => componentAnchor(entry.name) === hash);
      if (!component) return;

      if (!document.getElementById(hash)) {
        setQuery(component.name);
        setPackageFilter("all");
        setCategoryFilter("all");
        setSafetyFilter(component.safety === "denied" ? "all" : "available");
        setBindableOnly(false);
        setVisibleCount(PAGE_SIZE);
      }
      setExpanded((current) => new Set([...current, component.name]));
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
      });
    };

    revealHashTarget();
    window.addEventListener("hashchange", revealHashTarget);
    return () => window.removeEventListener("hashchange", revealHashTarget);
  }, [catalog]);

  if (loadError) {
    return (
      <div className={styles.error} role="alert">
        <strong>Component catalog unavailable.</strong> {loadError} <a href={catalogUrl}>Open the raw catalog</a> to
        inspect the generated data directly.
      </div>
    );
  }

  if (!catalog) return <ComponentReferenceFallback />;

  return (
    <section className={styles.explorer} aria-label="Custom JSX component catalog">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Release-matched static catalog</p>
          <h3 className={styles.title}>Explore {catalog.components.length} Custom JSX components</h3>
          <p className={styles.summary}>
            This browser reads the same versioned JSON artifact used by offline authoring. It never imports or executes
            the listed component objects.
          </p>
        </div>
        <a className={styles.rawLink} href={catalogUrl} target="_blank" rel="noreferrer">
          Open raw JSON
        </a>
      </header>

      <dl className={styles.versions}>
        <div>
          <dt>Catalog schema</dt>
          <dd>v{catalog.schemaVersion}</dd>
        </div>
        <div>
          <dt>Custom Widget</dt>
          <dd>{catalog.customWidgetVersion}</dd>
        </div>
        <div>
          <dt>Mantine</dt>
          <dd>{catalog.mantineVersion}</dd>
        </div>
        <div>
          <dt>Blocked capabilities</dt>
          <dd>{catalog.blockedCapabilities.length}</dd>
        </div>
      </dl>

      <section className={styles.globalProps} id="custom-jsx-global-props">
        <div>
          <h4>Shared serializable props</h4>
          <p>
            Every available component also receives these {catalog.globalProps.length} generated global, ARIA, data, and
            safe style props. Component cards below list only their component-specific additions.
          </p>
        </div>
        <button
          type="button"
          className={styles.expandButton}
          aria-expanded={showGlobalProps}
          aria-controls="custom-jsx-global-props-table"
          onClick={() => setShowGlobalProps((current) => !current)}
        >
          {showGlobalProps ? "Hide global props" : "View global props"}
        </button>
        {showGlobalProps && (
          <div className={styles.globalPropsTable} id="custom-jsx-global-props-table">
            <PropTable props={catalog.globalProps} types={catalog.types} />
          </div>
        )}
      </section>

      <div className={styles.filters}>
        <label className={styles.searchField}>
          <span>Search names, props, and subcomponents</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="For example: TextInput, bind, chart…"
          />
        </label>
        <label>
          <span>Package</span>
          <select value={packageFilter} onChange={(event) => setPackageFilter(event.currentTarget.value)}>
            <option value="all">All packages</option>
            {packages.map((packageName) => (
              <option key={packageName} value={packageName}>
                {packageName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.currentTarget.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {humanize(category)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Availability</span>
          <select value={safetyFilter} onChange={(event) => setSafetyFilter(event.currentTarget.value)}>
            <option value="available">Available only</option>
            <option value="all">Available and denied</option>
            <option value="allowed">Allowed only</option>
            <option value="wrapped">Wrapped only</option>
            <option value="denied">Denied only</option>
          </select>
        </label>
        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={bindableOnly}
            onChange={(event) => setBindableOnly(event.currentTarget.checked)}
          />
          Supports temporary <code>bind</code>
        </label>
      </div>

      <div className={styles.resultSummary} aria-live="polite">
        <strong>{filteredComponents.length}</strong> matching component{filteredComponents.length === 1 ? "" : "s"}
        {(query ||
          packageFilter !== "all" ||
          categoryFilter !== "all" ||
          safetyFilter !== "available" ||
          bindableOnly) && (
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => {
              setQuery("");
              setPackageFilter("all");
              setCategoryFilter("all");
              setSafetyFilter("available");
              setBindableOnly(false);
            }}
          >
            Reset filters
          </button>
        )}
      </div>

      {filteredComponents.length === 0 ? (
        <div className={styles.empty}>No component matches these filters.</div>
      ) : (
        <div className={styles.componentList}>
          {visibleComponents.map((component) => {
            const isExpanded = expanded.has(component.name);
            return (
              <article className={styles.componentCard} id={componentAnchor(component.name)} key={component.name}>
                <div className={styles.componentHeading}>
                  <div>
                    <div className={styles.componentNameRow}>
                      <h4>{component.name}</h4>
                      <a
                        className={styles.anchorLink}
                        href={`#${componentAnchor(component.name)}`}
                        aria-label={`Link to ${component.name}`}
                      >
                        #
                      </a>
                    </div>
                    <div className={styles.badges}>
                      <span>{component.package}</span>
                      <span>{humanize(component.category)}</span>
                      <span data-safety={component.safety}>{component.safety}</span>
                      {component.bind && <span>bind: {component.bind.type}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.expandButton}
                    aria-expanded={isExpanded}
                    aria-controls={`${componentAnchor(component.name)}-details`}
                    onClick={() => {
                      setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(component.name)) next.delete(component.name);
                        else next.add(component.name);
                        return next;
                      });
                    }}
                  >
                    {isExpanded ? "Hide API" : "View API"}
                  </button>
                </div>
                {(component.description || component.deniedReason) && (
                  <p className={component.safety === "denied" ? styles.deniedReason : styles.description}>
                    {component.deniedReason ?? component.description}
                  </p>
                )}

                {isExpanded && (
                  <ComponentDetails
                    id={`${componentAnchor(component.name)}-details`}
                    component={component}
                    types={catalog.types}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}

      {visibleCount < filteredComponents.length && (
        <button
          type="button"
          className={styles.showMoreButton}
          onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
        >
          Show {Math.min(PAGE_SIZE, filteredComponents.length - visibleCount)} more
        </button>
      )}
    </section>
  );
}

function decodeLocationHash(hash: string) {
  const value = hash.slice(1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function ComponentDetails({ id, component, types }: { id: string; component: CatalogComponent; types: string[] }) {
  return (
    <div className={styles.details} id={id}>
      <div className={styles.detailsGrid}>
        <section>
          <CustomWidgetCodeExample
            id={`${componentAnchor(component.name)}-usage`}
            label="Usage example"
            language="jsx"
            code={buildCustomJsxComponentUsageExample(component, { types })}
            height="180px"
          />
        </section>

        <section>
          <h5>Component contract</h5>
          {component.bind ? (
            <p>
              <code>bind</code> stores a temporary <code>{component.bind.type}</code> input. Initialize it with{" "}
              <code>{component.bind.initialProp}</code>.
            </p>
          ) : (
            <p>This component does not expose a temporary-input adapter.</p>
          )}
          {component.subcomponents.length > 0 && (
            <p>
              <strong>Subcomponents:</strong>{" "}
              {component.subcomponents.map((name, index) => (
                <span key={name}>
                  {index > 0 && ", "}
                  <code>{name}</code>
                </span>
              ))}
            </p>
          )}
          {component.blockedProps.length > 0 && (
            <ul className={styles.a11yList}>
              {component.blockedProps.map((prop) => (
                <li key={prop.name}>
                  <code>{prop.name}</code> is blocked: {prop.reason}
                </li>
              ))}
            </ul>
          )}
          {component.accessibilityRequirements.length > 0 && (
            <ul className={styles.a11yList}>
              {component.accessibilityRequirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          )}
          <a href={component.documentationUrl} target="_blank" rel="noreferrer">
            Open upstream documentation
          </a>
        </section>
      </div>

      <section>
        <h5>
          Component props <span className={styles.muted}>({component.props.length})</span>
        </h5>
        {component.props.length === 0 ? (
          <p>No component-specific props are exposed.</p>
        ) : (
          <PropTable props={component.props} types={types} />
        )}
      </section>

      <details className={styles.rawComponent}>
        <summary>Raw component JSON</summary>
        <CustomWidgetCodeExample
          id={`${componentAnchor(component.name)}-json`}
          label="Component JSON"
          code={JSON.stringify(component, null, 2)}
          height="320px"
        />
      </details>
    </div>
  );
}

function PropTable({ props, types }: { props: CatalogProp[]; types: string[] }) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.propsTable}>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Required</th>
            <th>Known values</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr key={prop.name}>
              <td>
                <code>{prop.name}</code>
              </td>
              <td>
                <code className={styles.type}>{types[prop.typeRef] ?? "unknown"}</code>
              </td>
              <td>{prop.required ? <strong>Yes</strong> : "No"}</td>
              <td>
                {prop.literalValues?.length ? (
                  <code>{prop.literalValues.map(formatLiteral).join(" | ")}</code>
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </td>
              <td>{prop.description ?? <span className={styles.muted}>—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function componentAnchor(name: string) {
  return `custom-jsx-component-${name
    .replaceAll(".", "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()}`;
}

function humanize(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatLiteral(value: string | number | boolean | null) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
