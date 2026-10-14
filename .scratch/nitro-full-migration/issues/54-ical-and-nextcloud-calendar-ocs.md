# 54: iCal and Nextcloud calendar/OCS

**What to build:** Configure/test private iCal and Nextcloud connections and consume complete calendar/OCS notification results with accurate recurrence/timezone behavior and secret-safe URLs.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds `ical,nextcloud`. iCal uses private url feed secret; calendar only, no Stats and no generic HTTP. Form base origin is not the actual feed target. Nextcloud U/P Basic retains subdirectory CalDAV objects/recurrence/timezones and OCS notification/application errors; projected messages counts retrieved notifications, with native checks and H eligibility. Own shared calendar/result/recurrence contracts and DAV parsing, consumed by #49/#56. Exact source obligations: original INTEGRATION-015/research §§2.2–2.3/5.

## Required contracts

Accept #40 trusted Node HTTPS/DAV snapshot/query/operation/clock interfaces, #07 locale/timezone/clock revisions, #41 forms, #80 calendar and #77 notification consumption plus #04 policy-before-decrypt. Individual clock/calendar revisions gate only consumers that need them; not completion of all localization/providers. Real secrets/identity/storage/DAV runtime and each configure/test/native UI path are release joins.

## Decision holds

Detailed clock/timezone/range behavior remains held where unchosen; changing recurrence or timezone semantics requires an explicit disposition. Q11/Q12 apply to physical repository/conversion and Q15 applicable session continuity; native URL/trust exceptions, library selection and secure deployed feed/Nextcloud evidence remain qualified. No broad universal URL rule may erase private-feed/subdirectory behavior.

## Ownership

Own both clients, shared calendar DTO/recurrence contract and DAV-specific parsing. Consume #40's Node HTTPS/DAV bridge rather than duplicate Undici transport; #49/#56 implement their own calendar sources against this boundary. #77/#80 own widget queries/presentation, #41 forms, COMPOSITION manifests/assembly.

- [ ] Demonstrate authorized configure/test/masked edit/mode/remove/delete and native calendar/notification consumption for both kinds; enforce iCal no-H/no-Stats and Nextcloud's exact Basic/H mode, never exposing feed credentials in browser links/results/errors.
- [ ] Focused recurrence fixtures retain UID masters/exceptions, moved standalone exceptions, THISANDFUTURE, overlap/window edges, timezones and the 100000-iteration bound; replacement calendar libraries must prove those cases rather than generic date arithmetic.
- [ ] Nextcloud retains subdirectory DAV construction, objects/recurrences and OCS application errors; projected messages means retrieved notifications. Trusted Node HTTPS/DAV proxy/CA injection is distinct from Undici and is exercised.
- [ ] Preserve month/margins/release-compatible Date contracts; native query checks precede secrets, abort is observed between fetches/expansion, results/errors are redacted and config/trust/delete fences late data. Empty/partial/malformed/error states remain meaningful.
- [ ] Record real target calendar/notification UI joins, then only explicitly approved bounded live feed windows and Nextcloud calendar/OCS reads with known versions/topology. No upstream mutations or published feed URL is required; inaccessible sources stay unverified, not a mandatory automatic all-88 matrix.
