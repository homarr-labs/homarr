import React from "react";
import Layout from "@theme/Layout";
import { CarbonCoverStrict, CarbonCoverObserver, CarbonCoverCssOnlySecond } from "../components/carbon";

export default function CarbonTestPage() {
  return (
    <Layout title="Carbon Ads Test" description="Test different Carbon cover implementations">
      <div className="container margin-vert--lg">
        <h1>Carbon Ads Test</h1>
        <p>Compare three implementations to only show the cover unit.</p>

        <section style={{ marginTop: 24, marginBottom: 24 }}>
          <h2>1) Strict re-initialization</h2>
          <CarbonCoverStrict />
        </section>

        <section style={{ marginTop: 24, marginBottom: 24 }}>
          <h2>2) Observer trimming</h2>
          <CarbonCoverObserver />
        </section>

        <section style={{ marginTop: 24, marginBottom: 24 }}>
          <h2>3) CSS-only (hide first, keep cover)</h2>
          <CarbonCoverCssOnlySecond />
        </section>
      </div>
    </Layout>
  );
}
