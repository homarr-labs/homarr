# 84: Network, firewall, VPN, UPS and routing

**What to build:** Persist supported network/status selectors and render network, firewall, VPN, UPS and routing results with precise source identity/history and truthful unavailable states.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Seven options and three zero-option kinds convert/save/reload with compatible placement/integration checks; selected controller content, client/device health, UPS battery/load/voltage and Traefik TCP/UDP/entry points retain supported compact/advanced detail.
- [ ] Four firewall consumers preserve independent CPU/interface/memory/version failures, units and interface histories; controller summary is shared and missing/partial source data is never promoted to healthy zero values.
- [ ] Reads authorize before secret/session construction and return credential-free DTOs/links; preserve provider-specific unavailable capabilities without adding VPN/UPS administration or privileged unused Traefik methods.
- [ ] Firewall 10s, controller/VPN no-root-poll/manual recovery and effective UPS/Traefik refresh use exact source/history/selection keys; stale versus forbidden, approved hydration/client charts and focus/listener cleanup isolate instances. Future focused history units, zero-option authorization, conversion and independent-error/query evidence runs at scoped target gates.

## Coverage

`networkControllerSummary` (0), `networkControllerStatus` (1): `content`; `firewall` (0), `vpn` (0); `ups` (3): `showBattery`, `showLoad`, `showVoltage`; `traefik` (3): `showTcp`, `showUdp`, `showEntryPoints`. Inputs consumed `select`, `switch`. Primary `widget.networkController.summary`, `widget.firewall.getFirewallCpuStatus/getFirewallInterfacesStatus/getFirewallMemoryStatus/getFirewallVersionStatus`, `widget.vpn.getSummaries`, `widget.ups.getSummaries`, `widget.traefik.getDashboard`. Families controller `unifiController`; firewall `opnsense`; VPN `gluetun`; UPS `peaNut`; routing `traefik`; each also `mock`. Native sessions/history/SDK stay #59, Traefik #61. Exact [network evidence](../drafts/widgets.md#widget-network--network-firewall-vpn-ups-and-routing-status).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket) under [DESIGN](../DESIGN.md); type/refinement/nullish defaults and saved/preview membership/read policy apply even to zero-option placements.

## Required contracts

Initially unaccepted: #59 status/session/cookie/history DTOs; #61 routing dashboard; #40 execution; #03 history/cache; #04 view/use/preview; #67 actual query/status/host; #68 options; #07 units/time; #120 typed contributions. Later real native/history/widget evidence is not a completed-provider start barrier or whole #59 finishing dependency.

## Decision holds

Q11/Q12 persisted settings/conversion, Q13 affected saves; historical freshness/query boundaries, selective SSR and demo override need explicit acceptance. Q15 affects session changes only; Redis removal and singleton are settled.

## Ownership

#84 owns six read-only widget services/renderers, not network sessions, firewall/native histories or Traefik upstream. #68 options/#29 placement and COMPOSITION central installation remain singular; exclusive local allocation precedes dispatch.
