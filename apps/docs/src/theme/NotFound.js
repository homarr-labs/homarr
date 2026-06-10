import React from 'react';
import Translate, { translate } from '@docusaurus/Translate';
import { PageMetadata } from '@docusaurus/theme-common';
import Layout from '@theme/Layout';

export default function NotFound() {
  return (
    <>
      <PageMetadata
        title={translate({
          id: 'theme.NotFound.title',
          message: 'Page Not Found',
        })}
      />
      <Layout>
        <main className="container margin-vert--xl">
          <div className="row">
            <div className="col col--6 col--offset-3">
              <img
                src="/img/undraw_illustrations/undraw_taken_re_yn20.svg"
                alt=""
                height={200}
                width="auto"
                style={{
                  display: 'block',
                  marginBottom: '2rem',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              />

              <h1 className="hero__title">
                <Translate id="theme.NotFound.title" description="The title of the 404 page">
                  You found a dead link!
                </Translate>
              </h1>
              <p>
                <Translate id="theme.NotFound.p1" description="The first paragraph of the 404 page">
                  Oops, you got a dead link. This means, that the page you're looking for
                  is either not available or has been deleted.
                  We're sorry for the inconvenience.
                  If you believe, that this page should be reachable,
                  check your URL for any typos.
                </Translate>
              </p>
            </div>
          </div>
        </main>
      </Layout>
    </>
  );
}
