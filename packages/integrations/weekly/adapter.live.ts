import { createSelfHost } from "@self-host/testkit";
import type { App } from "@self-host/testkit";
import { expect, test } from "vitest";

import { verifyAdapter } from "./adapters";
import { assertCompleteRegistry, selectedProfile } from "./profiles";
import { sanitizeProvenance } from "./report";

assertCompleteRegistry();
const profile = selectedProfile();

test(profile.id, async ({ task }) => {
  const selfHost = createSelfHost({
    binary: process.env.SELF_HOST_TESTKIT_BINARY,
    manifest: process.env.SELF_HOST_TESTKIT_MANIFEST,
    timeoutMs: 720_000,
  });
  let peer: App | undefined;
  let stage = "bootstrap";
  let failure: string | undefined;
  try {
    peer = await selfHost.spinup(profile.app, { image: profile.image });
    stage = "provenance";
    expect(["127.0.0.1", "[::1]"]).toContain(new URL(peer.url).hostname);
    const provenance = sanitizeProvenance(await peer.info());
    expect(provenance).not.toBeNull();
    expect(provenance?.image).toBe(profile.image);
    task.meta.provenance = provenance;
    stage = "native-adapter";
    await verifyAdapter(profile.kind, peer, profile.id === "qBittorrent-v4");
  } catch {
    failure = `Live profile failed during ${stage}; private peer diagnostics are not exported`;
  } finally {
    try {
      try {
        await peer?.close();
      } finally {
        await selfHost.close();
      }
    } catch {
      failure = "Live profile teardown failed; manifest cleanup is required";
    }
  }
  if (failure) throw new Error(failure);
});
