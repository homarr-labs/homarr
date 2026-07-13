# Workshop design system

Workshop is a trustworthy community workbench inside Homarr, not a separate storefront brand.

## Visual direction

- Reuse the host surface: Docusaurus tokens on `homarr.dev`, Mantine components inside Homarr.
- Use Homarr red only for primary action and focus; warnings use restrained amber and errors use red with explanatory text.
- Keep surfaces flat, bordered, and readable. Cards may lift by 3px on pointer hover; no gradients, glass panels, or decorative dashboards.
- Typography follows each host. Headings are compact and confident; body copy stays warm, concrete, and short.
- Spacing follows an 8px rhythm, 12-16px corners, and 44px minimum controls.

## Interaction direction

- The catalog progression is discover → inspect → confirm → use.
- Every remote state has a named loading, empty, cached, unavailable, validation, permission, and success outcome.
- Community source is never executed on the website. Installation always follows source inspection and local validation.
- Motion is limited to 150-200ms hover/state feedback and skeleton loading, with reduced-motion fallbacks.
- Native dialogs or Mantine modals own focus, Escape, backdrop dismissal, and keyboard order.

## Voice

Clear, dependable, and community-minded. Explain what remains usable during failures and provide one direct recovery action. Avoid playful language during moderation, destructive actions, or service failures.
