import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

export default function StorePage() {
  const { siteConfig } = useDocusaurusContext();
  const storeUrl = (siteConfig.customFields?.storeUrl as string | undefined) ?? "http://localhost:8090";

  return (
    <Layout title="Marketplace" description="Community custom CSS and custom widgets for Homarr">
      <main className="marketplace bg-background text-foreground min-h-[80vh]">
        <BrowserOnly fallback={<div style={{ minHeight: "50vh" }} />}>
          {() => {
            const { StoreApp } = require("@site/src/components/store/StoreApp");
            return <StoreApp storeUrl={storeUrl} />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
