import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Layout from "@theme/Layout";

export default function WorkshopPage() {
  return (
    <Layout title="Workshop" description="Community widgets and CSS themes for Homarr">
      <BrowserOnly fallback={<main style={{ minHeight: "70vh" }} />}>
        {() => {
          const { WorkshopApp } = require("@site/src/components/workshop/WorkshopPage");
          return <WorkshopApp />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
