import type { Metadata } from "next";

import { CodeContributorList } from "@/components/pages/about/code-contributors/code-contributor-list";
import { TranslationContributorList } from "@/components/pages/about/translations-contributors/translation-constributor-list";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About Homarr",
  description: "The volunteers and contributors behind the Homarr open-source project.",
};

export default function AboutPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8">
        <header className="max-w-3xl border-b pb-10">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">About us</h1>
          <p className="mt-4 text-lg leading-8 text-fd-muted-foreground">
            Homarr is a community driven open source project that is being maintained by volunteers. Thanks to these
            people, Homarr has been a growing project since 2021. Our team is working completely remote from many
            different countries on Homarr in their leisure time for no compensation.
          </p>
        </header>
        <section className="pt-10">
          <h2 className="mb-5 text-xl font-semibold">Code contributions</h2>
          <CodeContributorList />
        </section>
        <section className="pt-12">
          <h2 className="mb-5 text-xl font-semibold">Translation contributions</h2>
          <TranslationContributorList />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
