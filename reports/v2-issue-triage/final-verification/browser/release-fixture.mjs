import { createServer } from "node:http";

const releases = [
  {
    tag_name: "v2.4.1",
    published_at: new Date().toISOString(),
    html_url: "http://fixture.local/release/v2.4.1",
    body: "Synthetic current release",
    prerelease: false,
  },
  {
    tag_name: "v2.3.0",
    published_at: new Date(Date.now() - 86_400_000).toISOString(),
    html_url: "http://fixture.local/release/v2.3.0",
    body: "Synthetic previous release",
    prerelease: false,
  },
];

const sendJson = (response, status, payload) => {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
};

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  if (pathname === "/__metrics") return sendJson(response, 200, { releases: releases.length });
  if (pathname === "/github/repos/fixture-owner/fixture-repository/releases") {
    return sendJson(response, 200, releases);
  }
  if (pathname === "/github/repos/fixture-owner/fixture-repository") {
    return sendJson(response, 200, {
      html_url: "http://fixture.local/fixture-owner/fixture-repository",
      description: "Synthetic GitHub repository",
      fork: false,
      archived: false,
      created_at: "2026-01-01T00:00:00.000Z",
      stargazers_count: 1,
      open_issues_count: 0,
      forks_count: 0,
    });
  }
  sendJson(response, 404, { message: "not found" });
});

server.listen(47612, "127.0.0.1", () => {
  console.log("release fixture listening on 127.0.0.1:47612");
});
