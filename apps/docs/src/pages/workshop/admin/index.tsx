import React from "react";
import Layout from "@theme/Layout";

import { WorkshopAdmin } from "@site/src/components/workshop/WorkshopAdmin";

export default function WorkshopAdminRoute() {
  return (
    <Layout title="Workshop administration" noFooter>
      <WorkshopAdmin />
    </Layout>
  );
}
