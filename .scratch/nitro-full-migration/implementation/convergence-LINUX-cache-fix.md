# Linux runtime-cache amendment

Frozen source amendment approved by independent review `ses_ece795f9affeblYsmb38o2X9cg`.

The only supervisor change is the sixth fixed key `BUN_RUNTIME_TRANSPILER_CACHE_PATH: ""` in the private shared `environment` object. Disabling the runtime transpiler cache with an empty value for pinned Bun 1.4.2 was independently verified against official documentation and installed types; that verification was not repeated here.

The existing child spawn uses `env: environment`, and the existing clean-environment comparison uses `same(process.env, environment)`. Both therefore include the exact sixth key without separate logic changes.

Fixture freshness, gates, image, paths, identity, security, HTTP probes, budgets, shutdown, no-DB verifier, logging, and all other logic remain unchanged. The original control report and plan were not overwritten.

The coordinator must separately align the boot plan and launcher with the sixth key before any actual run. No commands, checks, tests, cache preflight, execution, or boot release were performed. Focused static checks and a pure dummy-cache test remain separately gated.
