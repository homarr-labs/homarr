# Docker service hostname investigation

Investigated against `dev` on 2026-10-03. The fix makes Homarr DNS caching opt-in and leaves native
name resolution active by default.

## Confirmed application failure

Homarr's HTTP agent imports the DNS initializer, which previously enabled `dns-caching@0.2.9`
globally with a minimum five-minute TTL. The dependency replaces callback and promise `dns.lookup`
with direct A/AAAA queries and caches the resulting address. It consults the OS resolver only after
DNS fails. This also changes `/etc/hosts` precedence and can bypass Compose `extra_hosts` entries.

Sources: [published dependency source](https://registry.npmjs.org/dns-caching/-/dns-caching-0.2.9.tgz),
[Node DNS implementation considerations](https://nodejs.org/docs/latest-v24.x/api/dns.html#implementation-considerations),
[Compose extra_hosts](https://docs.docker.com/reference/compose-file/services/#extra_hosts).

A temporary user-defined Docker network reproduced stale-address reuse using Node 24.18.0,
Undici 7.29.1, and the actual bundled Homarr `UndiciHttpAgent` and DNS initializer:

1. Start an HTTP fixture listening on container port `6767` with network alias `sonarr`.
2. Request `http://sonarr:6767` through Homarr's agent; receive HTTP 200.
3. Recreate only the fixture at a different IP, retaining the `sonarr` alias.
4. An original, native `dns.lookup` reference resolves the new IP immediately.
5. A new Homarr HTTP agent still connects using the cached IP and times out.

The request agents were recreated between requests, ruling out pooled-socket reuse. Environment
validation was enabled so the initializer applied its real default. Proxies were explicitly bypassed
to isolate DNS. This was a manual runtime reproduction; no production image build or test suite was run.

Docker explicitly requires clients to look up a recreated service's new IP:
[Compose networking: update containers on the network](https://docs.docker.com/compose/how-tos/networking/#update-containers-on-the-network).

## Separate deployment causes

- Same-network URLs use the container listening port. A published mapping `6767:8989` requires
  `http://sonarr:8989` internally. [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/).
- Native lookup in the existing local Homarr container returned `ENOTFOUND` for its neighboring
  services, although direct-IP HTTP reached Sonarr on `8989`. Fresh temporary containers resolved
  the same alias successfully. That is a separate Docker resolver failure; this PR cannot repair
  existing daemon/network registrations. No existing services or networks were modified.
- Homarr's `EnvHttpProxyAgent` respects outbound proxy variables. Docker aliases need `NO_PROXY`
  entries when the proxy cannot reach them. Preserve the operator's explicit proxy configuration.
  [Undici 7.29.1 EnvHttpProxyAgent](https://github.com/nodejs/undici/blob/v7.29.1/docs/docs/api/EnvHttpProxyAgent.md).
- Next.js `images.dangerouslyAllowLocalIP` applies to image optimization. Integration requests use
  Undici directly, so that setting does not solve integration connectivity.
  [Next.js Image configuration](https://nextjs.org/docs/app/api-reference/components/image#dangerouslyallowlocalip).

## Scope and tradeoff

Default requests now use the OS resolver and see Docker address changes on new connections.
`ENABLE_DNS_CACHING=true` remains available for operators who deliberately accept cached addresses
and DNS-first resolution. This may increase DNS queries compared with the old default; HTTP connection
reuse remains unchanged. Existing explicit opt-ins must be removed or set to `false` to get native lookup.

The same manual recreation probe passed after the default changed: both native lookup and Homarr's
HTTP agent followed the new service IP and received HTTP 200 without restarting the client process.
