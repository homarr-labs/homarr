import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

export default function WorkshopPage() {
  const { siteConfig } = useDocusaurusContext();
  const configuredWorkshopUrl = (siteConfig.customFields?.workshopUrl as string | undefined) ?? "";

  return (
    <Layout title="Workshop" description="Community custom CSS and custom widgets for Homarr">
      <main className="marketplace bg-background text-foreground min-h-[80vh]">
        <BrowserOnly fallback={<div style={{ minHeight: "50vh" }} />}>
          {() => {
            const { WorkshopApp } = require("@site/src/components/workshop/WorkshopApp");
            return <WorkshopApp workshopUrl={configuredWorkshopUrl || window.location.origin} />;
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
