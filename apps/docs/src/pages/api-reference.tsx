import React from "react";
import Layout from "@theme/Layout";
import BrowserOnly from "@docusaurus/BrowserOnly";

export default function ApiReferencePage() {
  return (
    <Layout title="API Reference" description="Homarr OpenAPI Reference">
      <BrowserOnly fallback={<div style={{ height: "100vh" }} />}>
        {() => {
          const { ThemedApiReference } = require("@site/src/components/themed-api-reference");
          return (
            <ThemedApiReference
              configuration={{
                url: "/api/open-api-schema.json",
                theme: "kepler",
                hideModels: false,
                hideDownloadButton: false,
                mcp: { disabled: true },
                customCss: `
                  .scalar-sidebar-footer a[href="https://www.scalar.com"] { display: none !important; }
                `,
              }}
            />
          );
        }}
      </BrowserOnly>
    </Layout>
  );
}
