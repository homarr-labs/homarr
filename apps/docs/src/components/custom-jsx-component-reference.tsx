import React from "react";

import customJsxComponentRegistry from "../generated/custom-jsx-components.json";

const enabledComponents = customJsxComponentRegistry.filter((component) => component.safety !== "denied");
const deniedComponents = customJsxComponentRegistry.filter((component) => component.safety === "denied");
const categories = [...new Set(enabledComponents.map((component) => component.category))];

export function CustomJsxComponentReference() {
  return (
    <>
      <h3>Enabled and wrapped components</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Components</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category}>
              <td>
                <code>{category}</code>
              </td>
              <td>
                {enabledComponents
                  .filter((component) => component.category === category)
                  .map((component) => (
                    <span key={component.name} style={{ display: "inline-block", margin: "0 0.5rem 0.35rem 0" }}>
                      <a href={component.documentationUrl}>
                        <code>{component.name}</code>
                      </a>
                      {component.safety === "wrapped" && <small> (wrapped)</small>}
                    </span>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Denied components</h3>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {deniedComponents.map((component) => (
            <tr key={component.name}>
              <td>
                <a href={component.documentationUrl} aria-label={component.name}>
                  <code>{component.name}</code>
                </a>
              </td>
              <td>{component.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
