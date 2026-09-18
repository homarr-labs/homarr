import assert from "node:assert/strict";
import http from "node:http";
const { withHttpRequestSignalAsync, fetchWithTrustedCertificatesAsync, createAxiosCertificateInstanceAsync } =
  await import(`${process.cwd()}/packages/core/src/infrastructure/http/index.ts`);
let aborted = 0;
const server = http.createServer((req, res) => {
  req.on("close", () => {
    if (!res.writableEnded) aborted++;
  });
  if (req.url === "/fast") res.end("ok");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const axios = await createAxiosCertificateInstanceAsync();
  for (const request of [() => fetchWithTrustedCertificatesAsync(base + "/slow"), () => axios.get(base + "/slow")]) {
    const controller = new AbortController();
    const pending = withHttpRequestSignalAsync(controller.signal, request);
    setTimeout(() => controller.abort(), 300);
    await assert.rejects(pending);
    assert.equal(await (await fetchWithTrustedCertificatesAsync(base + "/fast")).text(), "ok");
  }
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(aborted, 2);
  console.log("PASS: scoped cancellation closes both live fetch/Axios sockets; unrelated requests succeed.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server.closeAllConnections();
  server.close();
  process.exit(process.exitCode ?? 0);
}
