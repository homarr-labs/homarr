# PR Review TODOs

From review by **manuel-rw** on [homarr-labs/homarr#5362](https://github.com/homarr-labs/homarr/pull/5362#pullrequestreview-4032482807).

---

## [x] 1. Remove Umami from `development.docker-compose.yml`

**File:** `development/development.docker-compose.yml` (lines 64–74 + `umami_db_data` volume)

**Issue:** The dev compose should not include a container for every service Homarr supports. Remove the `umami-db` and `umami` services and the `umami_db_data` volume entry.

---

## [x] 2. Extract `urlDescription` field to a separate PR

**File:** `packages/definitions/src/integration.ts` (line 31)

**Issue:** The `urlDescription?: string` property added to the `IntegrationDef` interface is a cross-cutting change to core types unrelated to the Umami feature itself. It should be submitted as its own separate PR.

---

## [x] 3. Use `TestConnectionError.StatusResult` in `testingAsync`

**File:** `packages/integrations/src/umami/umami-integration.ts` (line 37)

**Issue:** The error branch in `testingAsync` currently does:
```ts
throw new ResponseError(response);
```
It should follow the pattern used by `homeassistant-integration.ts:108`:
```ts
return TestConnectionError.StatusResult(response);
```
Return an error result instead of throwing.

---

## [x] 4. Translate hardcoded strings in `formatTimeFrameLabel`

**File:** `packages/widgets/src/umami/component.tsx` (line 74)

**Issue:** The `formatTimeFrameLabel` function returns raw English strings (`"Today"`, etc.). All user-visible strings must go through the translation system (i18n), consistent with the rest of the codebase.

---

## [x] 5. Use locale-aware date formatting (remove hardcoded `"en-US"`)

**File:** `packages/widgets/src/umami/component.tsx` (lines 78, 82)

**Issue:** Month names are formatted with `toLocaleString("en-US", ...)`, which always produces English output. Drop the hardcoded locale so the user's own locale is used:
```ts
// Before
return d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });

// After
return d.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
```
Apply this fix to both the `"month"` and `"lastMonth"` cases.

---

# CI Failures — PR #5362

From [Actions run 23691480839](https://github.com/homarr-labs/homarr/actions/runs/23691480839?pr=5362).

---

## [x] 6. Typecheck — register new widget kinds in old-schema union (TS2345)

**File:** `packages/cron-jobs/src/jobs/integrations/umami.ts`

`"umamiTopPages"`, `"umamiTopReferrers"`, and `"umamiMultiEvent"` are not assignable to the widget kind union type. Register them in `packages/old-schema` wherever the widget kind union is defined.

---

## [x] 7. Lint — remove unnecessary type assertions (`@typescript-eslint/no-unnecessary-type-assertion`)

**Files:**
- `packages/widgets/src/_inputs/widget-umami-event-input.tsx` (lines 17, 18)
- `packages/widgets/src/_inputs/widget-umami-event-names-input.tsx` (lines 17, 18)
- `packages/widgets/src/_inputs/widget-umami-website-input.tsx` (line 17)

Remove the `as SomeType` casts — TypeScript already infers the correct type without them.

---

## [x] 8. Lint — remove unnecessary optional chains (`@typescript-eslint/no-unnecessary-condition`)

**Files:**
- `packages/integrations/src/umami/umami-integration.ts` (lines 308, 370)
- `packages/cron-jobs/src/jobs/integrations/umami.ts` (line 45)

Remove `?.` optional chains on values TypeScript knows are non-nullish.

---

## [x] 9. Format — run Prettier on umami files

Run `pnpm prettier --write` on the following files:
- `packages/cron-jobs/src/jobs/integrations/umami.ts`
- `packages/widgets/src/_inputs/widget-umami-event-input.tsx`
- `packages/widgets/src/umami/component.tsx`
- `packages/widgets/src/umami/index.ts`
- `packages/integrations/src/umami/umami-integration.ts`
- `packages/integrations/src/umami/test/umami-integration.spec.ts`

---

## [x] 10. Tests — fix `getEventNamesAsync` returning empty array

**File:** `packages/integrations/src/umami/umami-integration.ts` + `packages/integrations/src/umami/test/umami-integration.spec.ts`

Two tests fail:
- `should return sorted unique event names` — expected `['button_click', 'lookup_submit']`, got `[]`
- `should handle flat array response format` — expected `['signup']`, got `[]`

`getEventNamesAsync` is not extracting event names from the API response. The response shape likely doesn't match what the parser expects.

---

## [ ] 11. E2E — investigate LLDAP authorization timeout

**File:** `e2e/lldap.spec.ts:52`

`page.waitForURL(...)` times out (30s) waiting for redirect to Homarr homepage after LLDAP login. Verify whether this test was passing on `main` before the PR — likely a pre-existing flaky test unrelated to the umami changes.

---

## [ ] 12. Add subscription endpoints to replace removed cron jobs

**Context:** The four Umami cron jobs (`umami`, `umamiTopPages`, `umamiTopReferrers`, `umamiMultiEvent`) were removed from `packages/cron-jobs/` in response to reviewer feedback (Meierschlumpf, PR #5362). The reviewer's position: cron jobs that pre-warm the cache only make sense if paired with subscription endpoints that push those updates to connected clients — otherwise the cache warms in the background but the widget never receives it until the next manual query.

**Current behavior:** Widget data is fetched on demand. First load per 5-minute cache window hits the Umami API live (~200–600ms spinner). Subsequent loads within that window are instant (cache hit). Active visitors still polls client-side every 30s — unchanged.

**What needs to be built:**
- Add `subscribe()` methods to the four request handlers (`umamiRequestHandler`, `umamiTopPagesRequestHandler`, `umamiTopReferrersRequestHandler`, `umamiMultiEventRequestHandler`) in `packages/request-handler/src/umami.ts`
- Add subscription procedures (`subscribeVisitorStats`, `subscribeTopPages`, `subscribeTopReferrers`, `subscribeMultiEventTimeSeries`) in `packages/api/src/router/widgets/umami.ts` following the pattern in `health-monitoring.ts`
- Update the four widget components to use `useSubscription` in place of `useQuery`/`useSuspenseQuery` for those endpoints
- Re-add the cron jobs once subscriptions exist to deliver cache updates to connected clients

**Reference:** See `packages/api/src/router/widgets/health-monitoring.ts` for the full subscription + cron job pattern.

**Depends on:** Nothing blocking — can be done incrementally. Add subscriptions first, validate, then re-add cron jobs.
