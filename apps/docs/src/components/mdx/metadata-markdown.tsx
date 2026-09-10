import { asMarkdown } from "fumadocs-core/server";
import type { ComponentProps, ReactNode } from "react";

import { AddingIntegration } from "@/components/integrations/adding";
import type { IntegrationHeader } from "@/components/integrations/header";
import { secretKinds, type IntegrationSecrets } from "@/components/integrations/secrets";
import type { IntegrationCapabilites } from "@/components/integrations/widgets";
import { AddingWidget } from "@/components/widgets/adding";
import type { WidgetHeader } from "@/components/widgets/header";
import type { WidgetIntegrations } from "@/components/widgets/integrations";
import { WidgetInteractionGuide } from "@/components/widgets/interactions";
import { getDocsHref } from "@/lib/docs-path";
import type { WidgetConfiguration } from "@/types";

// Fumadocs supplies the original MDX props, including typed metadata and JSX steps.
function markdown<Props>(component: (props: Props) => ReactNode) {
  return (props: Props) => {
    asMarkdown();
    return component(props);
  };
}

function configuration({ items }: WidgetConfiguration): ReactNode {
  return items.map((item, index) => (
    <div key={index}>
      <p>
        <strong>{item.name}</strong>: {item.description}
      </p>
      <p>
        Values:{" "}
        {typeof item.values === "string"
          ? item.values
          : item.values.type === "boolean"
            ? "yes / no"
            : item.values.type === "select"
              ? item.values.options.join(", ")
              : item.values.type === "string"
                ? "String"
                : `${item.values.name}${item.values.type === "array" ? "[]" : ""}`}
        . Default: {item.defaultValue}.
      </p>
      {typeof item.values !== "string" && "configuration" in item.values
        ? configuration(item.values.configuration)
        : null}
    </div>
  ));
}

export const metadataMarkdownComponents = {
  AddingIntegration: markdown(AddingIntegration),
  AddingWidget: markdown(AddingWidget),
  WidgetInteractionGuide: markdown(WidgetInteractionGuide),
  IntegrationHeader: markdown(({ integration, categories }: ComponentProps<typeof IntegrationHeader>) => (
    <>
      <p>{integration.description}</p>
      <p>Categories: {categories.join(", ")}</p>
    </>
  )),
  WidgetHeader: markdown(({ widget, categories }: ComponentProps<typeof WidgetHeader>) => (
    <>
      <p>{widget.description}</p>
      <p>Categories: {categories.join(", ")}</p>
    </>
  )),
  IntegrationSecrets: markdown(({ secrets }: ComponentProps<typeof IntegrationSecrets>) =>
    secrets.map((secret, index) => (
      <div key={index}>
        {secret.tabLabel ? (
          <p>
            <strong>{secret.tabLabel}</strong>
          </p>
        ) : null}
        {secret.header}
        {secret.credentials.length === 0 ? (
          <p>No credentials required.</p>
        ) : (
          secret.credentials.map((credential) => (
            <p key={credential}>
              <strong>{secretKinds[credential].name}</strong>: {secretKinds[credential].description}
            </p>
          ))
        )}
        {secret.body}
        {secret.steps.length > 0 ? (
          <>
            <p>Steps to retrieve the credentials:</p>
            <ol>
              {secret.steps.map((step, stepIndex) => (
                <li key={stepIndex}>{step}</li>
              ))}
            </ol>
          </>
        ) : null}
        {secret.footer}
      </div>
    )),
  ),
  IntegrationCapabilites: markdown(({ items }: ComponentProps<typeof IntegrationCapabilites>) =>
    items.map((item, index) => {
      const capability = "widget" in item ? item.widget : item.capability;
      return (
        <p key={index}>
          <a href={getDocsHref(capability.path)}>{capability.name}</a>: {capability.description} {item.note}
        </p>
      );
    }),
  ),
  WidgetIntegrations: markdown(({ items }: ComponentProps<typeof WidgetIntegrations>) =>
    items.map(({ integration, note }) => (
      <p key={integration.name}>
        <a href={getDocsHref(integration.path)}>{integration.name}</a>: {integration.description} {note}
      </p>
    )),
  ),
  WidgetConfig: markdown(({ configuration: value }: { configuration: WidgetConfiguration }) => configuration(value)),
};
