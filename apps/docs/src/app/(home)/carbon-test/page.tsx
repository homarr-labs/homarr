import type { Metadata } from "next";

import { CarbonCoverCssOnlySecond, CarbonCoverObserver, CarbonCoverStrict } from "@/components/carbon";

export const metadata: Metadata = {
  title: "Carbon Ads test",
  robots: { index: false, follow: false },
};

export default function CarbonTestPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8">
      <h1 className="text-3xl font-semibold">Carbon Ads test</h1>
      <p className="mt-3 text-fd-muted-foreground">Compare the three cover-unit implementations.</p>
      <section className="my-8">
        <h2 className="text-xl font-medium">Strict re-initialization</h2>
        <CarbonCoverStrict />
      </section>
      <section className="my-8">
        <h2 className="text-xl font-medium">Observer trimming</h2>
        <CarbonCoverObserver />
      </section>
      <section className="my-8">
        <h2 className="text-xl font-medium">CSS-only</h2>
        <CarbonCoverCssOnlySecond />
      </section>
    </main>
  );
}
