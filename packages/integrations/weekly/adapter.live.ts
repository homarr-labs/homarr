import { withApp } from "@ajnart/self-host-testkit";
import { expect, test } from "vitest";

import { verifyAdapter } from "./adapters";
import { assertCompleteRegistry, selectedProfile } from "./profiles";
import { sanitizeProvenance } from "./report";

assertCompleteRegistry();
const profile = selectedProfile();

test(profile.id, async ({ task }) => {
  let stage = "bootstrap";
  let teardownFailed = false;
  try {
    await withApp(
      profile.app,
      async (peer) => {
        stage = "provenance";
        expect(["127.0.0.1", "[::1]"]).toContain(new URL(peer.url).hostname);
        const provenance = sanitizeProvenance(await peer.info());
        expect(provenance).not.toBeNull();
        expect(provenance?.image).toBe(profile.image);
        task.meta.provenance = provenance;
        stage = "native-adapter";
        await verifyAdapter(profile.kind, peer, profile.id === "qBittorrent-v4");
        stage = "teardown";
      },
      {
        image: profile.image,
        timeoutMs: 720_000,
        onCleanupError: () => {
          teardownFailed = true;
        },
      },
    );
  } catch {
    if (teardownFailed || stage === "teardown")
      throw new Error("Live profile teardown failed; manifest cleanup is required");
    throw new Error(`Live profile failed during ${stage}; private peer diagnostics are not exported`);
  }
});
