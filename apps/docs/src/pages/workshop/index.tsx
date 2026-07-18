import React from "react";
import Layout from "@theme/Layout";

import { WorkshopPage } from "@site/src/components/workshop/WorkshopPage";

export default function WorkshopRoute() {
  return (
    <Layout title="Workshop" description="Discover and publish Homarr Custom JSX widgets">
      <WorkshopPage />
    </Layout>
  );
}
