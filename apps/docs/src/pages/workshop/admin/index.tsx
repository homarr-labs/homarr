import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Layout from "@theme/Layout";

export default function WorkshopAdminPage() {
  return (
    <Layout title="Workshop moderation" noFooter>
      <BrowserOnly fallback={<main style={{ minHeight: "70vh" }} />}>
        {() => {
          const { WorkshopAdmin } = require("@site/src/components/workshop/WorkshopAdmin");
          return <WorkshopAdmin />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
