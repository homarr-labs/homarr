import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

import { WorkshopAdmin } from "@site/src/components/workshop/WorkshopAdmin";

export default function WorkshopAdminRoute() {
  const { siteConfig } = useDocusaurusContext();
  const workshopUrl = (siteConfig.customFields?.workshopUrl as string | undefined) ?? "";
  return (
    <Layout title="Workshop administration" noFooter>
      <WorkshopAdmin workshopUrl={workshopUrl} />
    </Layout>
  );
}
