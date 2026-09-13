# Security

All requests use Homarr's protected server executor. Source origin, network scope, DNS, redirects, SSRF, rate limits, permissions, size limits, timeouts, and encrypted credential injection remain enforced.

The JSX interpreter blocks imports, hooks, refs, raw event callbacks, browser requests, eval, arbitrary functions, prototype access, unsafe URLs, global CSS escape, arbitrary portals, bigint, statement blocks, IIFEs, and recursion. Regex literals must be bounded and reject backreferences, lookbehind, nested quantifiers, excessive length, and unsupported flags.

Credentials stay local and are never exported. Installers confirm or replace suggested private and loopback URLs for their deployment. Source origins are fixed by configuration.
