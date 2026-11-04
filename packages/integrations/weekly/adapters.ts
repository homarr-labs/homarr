import type { App } from "@ajnart/self-host-testkit";
import { expect } from "vitest";

import type { IntegrationKind } from "@homarr/definitions";

import { createIntegrationAsync } from "../src/factory";
import type { IntegrationInput } from "../src/base/integration";

const input = (kind: IntegrationKind, peer: App, decryptedSecrets: IntegrationInput["decryptedSecrets"]) => ({
  id: "weekly-fixture",
  kind,
  name: "Weekly synthetic fixture",
  url: peer.url,
  externalUrl: null,
  decryptedSecrets,
});

export async function verifyAdapter(kind: IntegrationKind, peer: App, legacy: boolean) {
  switch (kind) {
    case "sonarr": {
      const key = await peer.getApiKey();
      const client = await createIntegrationAsync({ ...input(kind, peer, [{ kind: "apiKey", value: key }]), kind });
      expect((await client.testConnectionAsync()).success).toBe(true);
      expect((await client.getServiceVersionAsync()).version).toMatch(/^\d+\./);
      expect(await client.getLibraryStatsAsync()).toEqual({
        shows: 0,
        monitored: 0,
        episodes: 0,
        downloaded: 0,
        storage: 0,
      });
      expect(await client.getMissingAsync()).toEqual({ items: [], totalCount: 0 });
      expect(await client.getMediaQueueAsync()).toEqual({ items: [], totalCount: 0 });
      expect(await client.getCalendarEventsAsync(new Date("2026-01-01"), new Date("2026-01-02"))).toEqual([]);
      const invalid = await createIntegrationAsync({
        ...input(kind, peer, [{ kind: "apiKey", value: "invalid-weekly-key" }]),
        kind,
      });
      const rejected = await invalid.testConnectionAsync();
      expect(rejected.success).toBe(false);
      if (!rejected.success) expect(rejected.error.type).toBe("authorization");
      await expect(invalid.getLibraryStatsAsync()).rejects.toThrow();
      break;
    }
    case "radarr": {
      const key = await peer.getApiKey();
      const client = await createIntegrationAsync({ ...input(kind, peer, [{ kind: "apiKey", value: key }]), kind });
      expect((await client.testConnectionAsync()).success).toBe(true);
      expect((await client.getServiceVersionAsync()).version).toMatch(/^\d+\./);
      expect(await client.getLibraryStatsAsync()).toEqual({ movies: 0, monitored: 0, downloaded: 0, storage: 0 });
      expect(await client.getMissingAsync()).toEqual({ items: [], totalCount: 0 });
      expect(await client.getMediaQueueAsync()).toEqual({ items: [], totalCount: 0 });
      expect(await client.getCalendarEventsAsync(new Date("2026-01-01"), new Date("2026-01-02"))).toEqual([]);
      const invalid = await createIntegrationAsync({
        ...input(kind, peer, [{ kind: "apiKey", value: "invalid-weekly-key" }]),
        kind,
      });
      const rejected = await invalid.testConnectionAsync();
      expect(rejected.success).toBe(false);
      if (!rejected.success) expect(rejected.error.type).toBe("authorization");
      await expect(invalid.getLibraryStatsAsync()).rejects.toThrow();
      break;
    }
    case "prowlarr": {
      const key = await peer.getApiKey();
      const client = await createIntegrationAsync({ ...input(kind, peer, [{ kind: "apiKey", value: key }]), kind });
      expect((await client.testConnectionAsync()).success).toBe(true);
      expect((await client.getServiceVersionAsync()).version).toMatch(/^\d+\./);
      expect(await client.getIndexersAsync()).toEqual([]);
      const invalid = await createIntegrationAsync({
        ...input(kind, peer, [{ kind: "apiKey", value: "invalid-weekly-key" }]),
        kind,
      });
      const rejected = await invalid.testConnectionAsync();
      expect(rejected.success).toBe(false);
      if (!rejected.success) expect(rejected.error.type).toBe("authorization");
      await expect(invalid.getIndexersAsync()).rejects.toThrow();
      break;
    }
    case "bazarr": {
      const key = await peer.getApiKey();
      const client = await createIntegrationAsync({ ...input(kind, peer, [{ kind: "apiKey", value: key }]), kind });
      expect((await client.testConnectionAsync()).success).toBe(true);
      const badges = await client.getBadgesAsync();
      expect(badges.episodes).toBe(0);
      expect(badges.movies).toBe(0);
      expect(badges.providers).toBeGreaterThanOrEqual(0);
      expect(badges.status).toBeGreaterThanOrEqual(0);
      expect(typeof badges.sonarr_signalr).toBe("string");
      expect(typeof badges.radarr_signalr).toBe("string");
      const invalid = await createIntegrationAsync({
        ...input(kind, peer, [{ kind: "apiKey", value: "invalid-weekly-key" }]),
        kind,
      });
      const rejected = await invalid.testConnectionAsync();
      expect(rejected.success).toBe(false);
      if (!rejected.success) expect(rejected.error.type).toBe("authorization");
      await expect(invalid.getBadgesAsync()).rejects.toThrow();
      break;
    }
    case "sabNzbd": {
      const key = await peer.getApiKey();
      const client = await createIntegrationAsync({ ...input(kind, peer, [{ kind: "apiKey", value: key }]), kind });
      expect((await client.testConnectionAsync()).success).toBe(true);
      const versionUrl = new URL("/api", peer.url);
      versionUrl.search = new URLSearchParams({ mode: "version", output: "json", apikey: key }).toString();
      const version: unknown = await (await fetch(versionUrl, { signal: AbortSignal.timeout(10_000) })).json();
      expect(version).toEqual({ version: expect.stringMatching(/^\d+\./) });
      expect((await client.getClientJobsAndStatusAsync({ limit: 5 })).items).toEqual([]);
      await client.pauseQueueAsync();
      expect((await client.getClientJobsAndStatusAsync({ limit: 5 })).status.paused).toBe(true);
      await client.resumeQueueAsync();
      expect((await client.getClientJobsAndStatusAsync({ limit: 5 })).status.paused).toBe(false);
      const invalid = await createIntegrationAsync({
        ...input(kind, peer, [{ kind: "apiKey", value: "invalid-weekly-key" }]),
        kind,
      });
      expect((await invalid.testConnectionAsync()).success).toBe(false);
      await expect(invalid.getClientJobsAndStatusAsync({ limit: 5 })).rejects.toThrow();
      break;
    }
    case "qBittorrent": {
      const { username, password } = await peer.credentials();
      const secrets: IntegrationInput["decryptedSecrets"] = [
        { kind: "username", value: username },
        { kind: "password", value: password },
      ];
      const client = await createIntegrationAsync({ ...input(kind, peer, secrets), kind });
      expect((await client.testConnectionAsync()).success).toBe(true);
      expect(await client.getClientJobsAndStatusAsync({ limit: 5 })).toMatchObject({
        items: [],
        status: { rates: { down: 0, up: 0 }, types: ["torrent"] },
      });
      const login = await fetch(new URL("/api/v2/auth/login", peer.url), {
        method: "POST",
        headers: { Referer: peer.url },
        body: new URLSearchParams({ username, password }),
        signal: AbortSignal.timeout(10_000),
      });
      const cookies = login.headers
        .getSetCookie()
        .map((cookie) => cookie.split(";")[0])
        .join("; ");
      expect(cookies.length).toBeGreaterThan(0);
      const version = await (
        await fetch(new URL("/api/v2/app/version", peer.url), {
          headers: { Cookie: cookies, Referer: peer.url },
          signal: AbortSignal.timeout(10_000),
        })
      ).text();
      expect(version).toMatch(/^v\d+\./);
      if (legacy) expect(version).toMatch(/^v4\./);
      const invalid = await createIntegrationAsync({
        ...input(kind, peer, [
          { kind: "username", value: username },
          { kind: "password", value: "invalid-weekly-password" },
        ]),
        kind,
      });
      expect((await invalid.testConnectionAsync()).success).toBe(false);
      break;
    }
    case "jellyfin": {
      const key = await peer.getApiKey();
      const { username } = await peer.credentials();
      const client = await createIntegrationAsync({ ...input(kind, peer, [{ kind: "apiKey", value: key }]), kind });
      expect((await client.testConnectionAsync()).success).toBe(true);
      const auth = await client.getHttpAuthenticationAsync();
      const users: unknown = await (
        await fetch(new URL("/Users", peer.url), { headers: auth.headers, signal: AbortSignal.timeout(10_000) })
      ).json();
      expect(users).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ Name: username, Policy: expect.objectContaining({ IsAdministrator: true }) }),
        ]),
      );
      expect(await client.getMediaReleasesAsync()).toEqual([]);
      expect(await client.getCurrentSessionsAsync({ showOnlyPlaying: true })).toEqual([]);
      const wrongPassword = await createIntegrationAsync({
        ...input(kind, peer, [
          { kind: "username", value: username },
          { kind: "password", value: "invalid-weekly-password" },
        ]),
        kind,
      });
      expect((await wrongPassword.testConnectionAsync()).success).toBe(false);
      const wrongKey = await createIntegrationAsync({
        ...input(kind, peer, [{ kind: "apiKey", value: "invalid-weekly-key" }]),
        kind,
      });
      await expect(wrongKey.getMediaReleasesAsync()).rejects.toThrow();
      break;
    }
    default:
      throw new Error("Executable weekly profile has no native adapter assertions");
  }
}
