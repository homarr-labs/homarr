# Media adapter HTTP contracts

These fixtures are small authored protocol examples, not recordings of deployed services and not proof of compatibility with a particular upstream release. Field shapes come from the existing Homarr Sonarr/Radarr v3 adapters, Jellyfin session adapter, and Nextcloud OCS notification adapter reviewed during the suite audit. Names, identifiers, hosts, and credentials are synthetic. No upstream version is claimed.

The independent expectations describe user-facing meaning: one missing episode among 31 records, a download three-quarters complete, two release dates for one movie, an 8.2 Mb/s direct-play episode paused two minutes into a 30-minute runtime, and an OCS notification that disappears on refresh. Expected outputs are literals, not computed by production mappers or fixture-derived formulas.

Failure modes protected before implementation:

- Sonarr: API key or reverse-proxy prefix omitted; requested page size/expansion ignored; total count replaced by page length; download progress or public links mapped incorrectly.
- Radarr: optional release dates collapsed into one event; distinct cinema/digital dates lost; API key, prefix, or unmonitored query changed; library storage/download totals misreported.
- Jellyfin: SDK sends the wrong token/path; server or Homarr-owned sessions leak into the display; playback ticks interpreted as milliseconds; direct-play stream bitrates or private mapped IPv6 location are lost.
- Nextcloud: Basic credentials or mandatory OCS header/query lost under a subpath; a refresh retains removed notifications; an authentication failure is displayed as an empty successful result.

The service fixture server runs on loopback and checks actual HTTP requests. This covers adapter contracts, not full upstream servers, authentication provisioning, browser rendering, CalDAV discovery, or live compatibility. When an upstream protocol changes, replace the affected fixture from a documented sanitized payload and record its real provenance here.
