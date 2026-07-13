import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import Layout from "@theme/Layout";

export default function WorkshopDetailRoutePage() {
  return (
    <Layout title="Workshop submission">
      <BrowserOnly fallback={<main style={{ minHeight: "70vh" }} />}>
        {() => {
          const { WorkshopDetailRoute } = require("./WorkshopPage");
          return <WorkshopDetailRoute />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
