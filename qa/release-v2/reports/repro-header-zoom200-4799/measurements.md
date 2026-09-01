# Header zoom reproduction measurements

This is standalone black-box evidence for candidate `4799dd0251835d868b8123d004a6cb3ffc2c30cc`.

- Started: `2026-09-01T08:20:52+02:00`
- Ended: `2026-09-01T08:39:30+02:00`
- URL: `http://127.0.0.1:38637/`
- Fixture URL: `http://127.0.0.1:33469`
- Persona: Avery Admin; auth-vault profile name `qa-v2-s3-avery-admin` (credential values not recorded)
- Browser session: `repro-header-4799-s3`; namespace: `release-v2-repro-header-4799`
- Launch: headed false; `--args '--no-sandbox,--headless=new'`; zoom extension path `/tmp/homarr-release-v2-qa-zoom-4799dd02-s3-2-repro`
- Flags: `DEMO_MODE=true DEMO_READ_ONLY=false UNSAFE_ENABLE_MOCK_INTEGRATION=true`

## Viewport and initial layout

Native zoom proof: `visualViewport.scale=1`, `devicePixelRatio=2`, outer viewport `320x568`, inner CSS viewport `160x284`.

At the seeded home after login:

- document: `scrollWidth=152`, `clientWidth=152`, `scrollLeft=0`
- header: `x=0 y=0 width=152.5 height=60`, `scrollWidth=153`, `clientWidth=153`, `scrollLeft=0`, `overflow-x=hidden`
- visible right header zone (`[data-zone="right"]`): `x=27.3047 y=7.1016 width=115.1953 height=44.7969`, `clientWidth=115`, `scrollWidth=184`, `scrollLeft=0`, `overflow-x=auto`

Visible header control boxes at the initial position:

| Control | Box (CSS px) | Initial result |
| --- | --- | --- |
| Search | `x=27.3047 y=12.5 w=34 h=34`, right `61.3047` | visible |
| Edit board | `x=73.3047 y=12.5 w=34 h=34`, right `107.3047` | visible |
| Board settings | `x=117.3047 y=12.5 w=34 h=34`, right `151.3047` | visible at right edge |
| Account menu | `x=167.3047 y=7.1016 w=38 h=38`, right `205.3047` | outside the `160px` CSS viewport |

The exact `.mobileZone[data-zone="right"]` selector was absent in the rendered DOM. The visible equivalent is the CSS-module element selected by `[data-zone="right"]` above.

## Right-zone scroll evidence

Targeted scroll of the actual rendered right zone (single in-page measurement):

```text
before: clientWidth=115, scrollWidth=184, scrollLeft=0, account x=167.3047..205.3047
after:  clientWidth=115, scrollWidth=184, scrollLeft=69, account x=98.3047..136.3047
maxScrollLeft=69
```

The direct horizontal wheel (`dy=0, dx=200`), `scroll right 200`, and pointer-drag (`x=120` to `x=40` over the zone) attempts left the zone at `scrollLeft=0`. A clean keyboard Tab sequence to the account control did move the same zone to its maximum `scrollLeft=69`.

## Weather geometry distinction

The Weather `Open advanced view` control is dashboard content, not a header control. Its rendered box was `x=-12.5977 y=136.1641 width=137.5234 height=22` (right `124.9258`, bottom `158.1641`) inside the group labelled `Weather` at `x=26 y=126.1641`. The header itself ends at `y=60`.

## Reload/status counts

- Reload remained authenticated at `/` and still showed the seeded `qa-home-avery-admin` dashboard.
- Page errors after the final reload: `0`.
- Console entries after the final reload: `0`.
- Network requests after the final reload: `153` total; `149` with status `200`; `4` without a response status; no non-2xx status was observed among status-bearing requests.

