import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

import { WorkshopApp } from "@site/src/components/workshop/WorkshopApp";
import { WorkshopErrorBoundary } from "@site/src/components/workshop/WorkshopErrorBoundary";

export default function WorkshopPage() {
  const { siteConfig } = useDocusaurusContext();
  const configuredWorkshopUrl = (siteConfig.customFields?.workshopUrl as string | undefined) ?? "";

  return (
    <Layout title="Workshop" description="Community custom CSS and custom widgets for Homarr">
      <main className="marketplace bg-background text-foreground min-h-[80vh]">
        <BrowserOnly fallback={<div style={{ minHeight: "50vh" }} />}>
          {() => (
            <WorkshopErrorBoundary>
              <WorkshopApp workshopUrl={configuredWorkshopUrl || window.location.origin} />
            </WorkshopErrorBoundary>
          )}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
