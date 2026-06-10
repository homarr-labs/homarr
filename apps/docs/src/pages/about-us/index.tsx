import Layout from '@theme/Layout';
import React from 'react';
import { CodeContributorList } from '@site/src/components/pages/about/code-contributors/code-contributor-list';
import {
  TranslationContributorList,
} from '@site/src/components/pages/about/translations-contributors/translation-constributor-list';

export default function AboutUs() {
  return (
    <Layout title="About Homarr" description={"Homarr is a community driven open source project that is being maintained by volunteers. Homarr has been a growing project since 2021."}>
      <main className="mx-auto w-full md:w-2/3 ps-10 pr-10 mb-20 mt-10">
        <h1 className="text-5xl font-extrabold">About us</h1>
        <p className="text-lg text-gray-500">
          Homarr is a community driven open source project that is being maintained by volunteers.
          Thanks to these people, Homarr has been a growing project since 2021.
          Our team is working completely remote from many different countries on Homarr in their leisure time for no
          compensation.
        </p>

        <h2 className={'mt-10'}>Code contributions</h2>

        <CodeContributorList />

        <h2 className={'mt-10'}>Translation contributions</h2>

        <TranslationContributorList />
      </main>
    </Layout>
  );
}
