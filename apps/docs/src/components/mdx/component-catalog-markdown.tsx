// oxlint-disable-next-line import/no-unassigned-import -- Prevent catalog data from entering a client bundle.
import "server-only";
import { asMarkdown } from "fumadocs-core/server";

import type { CustomJsxAuthoringCatalog, CustomJsxPropDescriptor } from "@homarr/custom-widgets/catalog";
import catalogData from "@site/public/custom-widgets/component-catalog-v1.json";

const catalog = catalogData as CustomJsxAuthoringCatalog;

function Props({ items }: { items: CustomJsxPropDescriptor[] }) {
  asMarkdown();
  return (
    <ul>
      {items.map((prop) => (
        <li key={prop.name}>
          <code>{prop.name}</code>: <code>{catalog.types[prop.typeRef] ?? "unknown"}</code>.
          {prop.required && " Required."} {prop.description}
          {prop.literalValues && (
            <> Known values: {prop.literalValues.map((value) => JSON.stringify(value)).join(", ")}.</>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ComponentCatalogMarkdown() {
  return (
    <>
      <p>
        Custom JSX {catalog.customWidgetVersion}, Mantine {catalog.mantineVersion}. Properties are optional unless
        marked required. <a href="/custom-widgets/component-catalog-v1.json">Download the complete JSON catalog</a>.
      </p>
      <h2>Global properties</h2>
      <Props items={catalog.globalProps} />
      <h2>Blocked capabilities</h2>
      <ul>
        {catalog.blockedCapabilities.map((capability) => (
          <li key={`${capability.kind}-${capability.name}`}>
            <code>{capability.name}</code> ({capability.kind}): {capability.reason}
          </li>
        ))}
      </ul>
      {catalog.components.map((component) => (
        <section key={component.name}>
          <h2>{component.name}</h2>
          <p>
            {component.package}; {component.category}; safety: {component.safety}. {component.description}
          </p>
          {component.deniedReason && <p>Unavailable: {component.deniedReason}</p>}
          {component.bind && (
            <p>
              Bind a temporary {component.bind.type} input with <code>bind</code>. Initialize with{" "}
              <code>{component.bind.initialProp}</code>; reset with <code>{component.bind.resetProp}</code>.
            </p>
          )}
          {component.subcomponents.length > 0 && <p>Subcomponents: {component.subcomponents.join(", ")}.</p>}
          <Props items={component.props} />
          <ul>
            {component.blockedProps.map((prop) => (
              <li key={prop.name}>
                <code>{prop.name}</code> is blocked: {prop.reason}
              </li>
            ))}
            {component.accessibilityRequirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
          <p>
            <a href={component.documentationUrl}>Upstream documentation for {component.name}</a>
          </p>
        </section>
      ))}
    </>
  );
}
