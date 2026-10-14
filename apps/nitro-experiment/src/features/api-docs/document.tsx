import { renderToStaticMarkup } from "react-dom/server";

import { ApiDocs } from "./api-docs";

const styles = `
:root { color-scheme: light; font-family: system-ui, sans-serif; color: #212529; background: #fff; }
* { box-sizing: border-box; }
body { margin: 0; font-size: 1rem; line-height: 1.6; }
main { max-width: 76ch; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
nav { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; margin-bottom: 2rem; }
a { color: #1864ab; text-underline-offset: .2em; }
a:hover { color: #0b4479; }
a:focus-visible, summary:focus-visible { outline: 2px solid #1864ab; outline-offset: 4px; }
h1, h2, h3 { line-height: 1.25; text-wrap: balance; }
h1 { font-size: 2rem; margin: 0 0 1rem; }
h2 { font-size: 1.5rem; margin: 0 0 1rem; }
h3 { font-size: 1.125rem; margin: 1.75rem 0 .5rem; }
section { margin-top: 2.5rem; }
p { text-wrap: pretty; }
code { font-family: ui-monospace, monospace; font-size: .9em; overflow-wrap: anywhere; }
pre { background: #f1f3f5; padding: 1rem; border-radius: .5rem; white-space: pre-wrap; overflow-wrap: anywhere; }
.notice { border: 1px solid #adb5bd; border-radius: .5rem; padding: 1rem; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
caption { text-align: left; font-weight: 600; padding-bottom: .5rem; }
th, td { vertical-align: top; border-bottom: 1px solid #dee2e6; padding: .6rem .75rem .6rem 0; }
summary { cursor: pointer; padding: .5rem 0; color: #1864ab; }
`;

export function renderApiDocs(): string {
  const html = `<!doctype html>${renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Fixture board REST sample | Homarr Nitro experiment</title>
        <style>{styles}</style>
      </head>
      <body>
        <ApiDocs />
      </body>
    </html>,
  )}`;
  if (new TextEncoder().encode(html).byteLength > 32768) {
    throw new Error("Fixture API documentation exceeds its byte bound");
  }
  return html;
}
