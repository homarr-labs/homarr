import {
  deniedBoardExample,
  fixtureCookieName,
  openApiVersion,
  privateBoardExample,
  privateBoardRestPath,
  publicBoardExample,
  publicBoardRestPath,
} from "./reference";

export function ApiDocs() {
  return (
    <main>
      <nav aria-label="Fixture navigation">
        <a href="/boards/public">Public dashboard and fixture login</a>
        <a href="/openapi.json">OpenAPI JSON</a>
      </nav>
      <h1>Fixture board REST sample</h1>
      <p>
        One read-only operation: <code>GET /api/boards/&#123;boardId&#125;</code>. The generated OpenAPI{" "}
        {openApiVersion} document describes this mounted endpoint, not the full typed RPC API.
      </p>
      <p className="notice">
        Local, synthetic, nonproduction experiment. Keep the listener on loopback. No API key or bearer token is
        supported.
      </p>
      <section aria-labelledby="access-heading">
        <h2 id="access-heading">Access and responses</h2>
        <p>
          <code>boardId</code> is <code>public</code> or <code>private</code>. Anonymous visitors and the viewer can
          read the public board. Select the owner on the dashboard to read either board. Every read checks the live
          session and the same board policy as typed RPC.
        </p>
        <div className="table-scroll">
          <table>
            <caption>HTTP outcomes for the mounted sample</caption>
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">200</th>
                <td>Authorized sanitized board projection.</td>
              </tr>
              <tr>
                <th scope="row">400</th>
                <td>Invalid board ID or unexpected input field.</td>
              </tr>
              <tr>
                <th scope="row">403</th>
                <td>Private board denied, or canonical local request rejected.</td>
              </tr>
              <tr>
                <th scope="row">404</th>
                <td>Missing public/private record, unmatched route or unsupported method.</td>
              </tr>
              <tr>
                <th scope="row">500</th>
                <td>Unexpected failure or invalid output, with no internal detail.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Successful JSON contains board content, visibility, revision and capabilities. It excludes owner identity,
          session state and credentials. These examples show initial fixtures, not live data; saved content and
          revisions may differ. The outer local-request guard can return only{" "}
          <code>&#123;"code":"FORBIDDEN"&#125;</code>.
        </p>
      </section>
      <section aria-labelledby="examples-heading">
        <h2 id="examples-heading">Try the exact paths</h2>
        <p>
          Set <code>ORIGIN</code> to <code>NITRO_FIXTURE_ORIGIN</code>, default <code>http://127.0.0.1:3100</code>. URL,
          Host and any supplied Origin must match; foreign site metadata is denied. These commands are placeholders and
          do not run automatically.
        </p>
        <pre>
          <code>{'ORIGIN="<configured-loopback-origin>"'}</code>
        </pre>
        <h3>Public success, no session</h3>
        <p>
          <a href={publicBoardRestPath}>Read public board JSON</a>
        </p>
        <pre>
          <code>{`curl -i "$ORIGIN${publicBoardRestPath}"`}</code>
        </pre>
        <details>
          <summary>Example 200 public-reader response</summary>
          <pre>
            <code>{JSON.stringify(publicBoardExample, null, 2)}</code>
          </pre>
        </details>
        <h3>Private success, active owner</h3>
        <p>
          Select owner using the dashboard's fixture login, then{" "}
          <a href={privateBoardRestPath}>read private board JSON</a> in the same browser. For curl, supply an existing
          local owner cookie jar. This sample does not implement REST login or export browser cookies.
        </p>
        <pre>
          <code>{`curl -i --cookie "<local-owner-cookie-jar>" "$ORIGIN${privateBoardRestPath}"`}</code>
        </pre>
        <details>
          <summary>Example 200 owner response</summary>
          <pre>
            <code>{JSON.stringify(privateBoardExample, null, 2)}</code>
          </pre>
        </details>
        <h3>Private denial, anonymous or viewer</h3>
        <pre>
          <code>{`curl -i "$ORIGIN${privateBoardRestPath}"\ncurl -i --cookie "<local-viewer-cookie-jar>" "$ORIGIN${privateBoardRestPath}"`}</code>
        </pre>
        <pre>
          <code>{JSON.stringify(deniedBoardExample, null, 2)}</code>
        </pre>
        <p>Both requests return 403 with no private board content.</p>
      </section>
      <section aria-labelledby="session-heading">
        <h2 id="session-heading">Fixture session limits</h2>
        <p>
          <code>{fixtureCookieName}</code> is an opaque, HttpOnly, host-only, SameSite=Strict cookie with a 15-minute
          absolute lifetime. Secure is intentionally absent for this loopback HTTP experiment. Logout, expiry, eviction
          and process restart remove access; selecting viewer never authorizes a private read. Security annotations
          document the cookie but do not enforce access.
        </p>
        <p>
          Documentation requires a canonical local request but no login. Responses use{" "}
          <code>Cache-Control: no-store</code>. No live requests, tokens, external scripts, fonts or CDN assets are
          embedded here.
        </p>
      </section>
    </main>
  );
}
