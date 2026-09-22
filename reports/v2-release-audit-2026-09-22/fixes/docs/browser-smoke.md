# Documentation browser smoke

Built output: `apps/docs/build`, served locally at `http://127.0.0.1:3040`.

## Pages

| Page | Desktop 1440x900 | Mobile 390x844 | Changed content | Horizontal overflow |
| --- | --- | --- | --- | --- |
| `/docs/management/api/` | Rendered | Rendered | Saved integrations accept reachable IPv4 and IPv6 destinations | None (`390 / 390`) |
| `/docs/management/custom-widgets/requests-and-security/` | Rendered | Rendered | Saved integration and manual network-scope distinction | None (`390 / 390`) |
| `/docs/widgets/stats/` | Rendered | Rendered | Partial endpoint failure behavior | None (`390 / 390`) |

## Accessibility

The first axe-core 4.12.1 WCAG 2 A/AA pass found insufficient contrast in the shared light-theme Prism token colors and Carbon attribution. `apps/docs/src/css/custom.css` now supplies accessible light-theme token colors and theme-specific Carbon attribution colors.

After rebuilding:

- Desktop: all three pages report 0 axe violations.
- Mobile: all three pages report 0 axe violations.
- Dark desktop spot check on the Statistics page reports 0 axe violations. The Carbon attribution computes to `rgb(179, 179, 179)` on the `rgb(27, 27, 29)` page surface.
- Axe still marks some sidebar text as incomplete where overlapping elements prevent automatic background calculation; these are manual-review items, not reported violations.

## Validation

- `pnpm turbo build --filter=@homarr/docs`: passed.
- Build retained the existing Scalar dynamic-import warning and Docusaurus update-check permission warning.

## Screenshots

- `api-desktop.png`
- `api-mobile.png`
- `custom-widget-requests-desktop.png`
- `custom-widget-requests-mobile.png`
- `stats-desktop.png`
- `stats-mobile.png`
