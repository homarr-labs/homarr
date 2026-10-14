# 20: Task controls, status and startup work

**What to build:** Administrators manage the three real jobs through eight task operations, see keyed status/recovery and persisted schedule changes, and receive safe startup cleanup/drain. Own analytics send service—including its separate manual application action—and job body; icon synchronization remains #115-owned.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] Registry contains exactly analytics/iconsUpdater/ping; admin-enforced list/enable/disable/interval/start/stop/trigger/status preserves hidden/manual/custom-interval restrictions and durable enabled/cron edits, including disabled-init→enable and duplicate initialization without leaked schedules.
- [ ] Analytics job remains weekly/run-on-start/hidden/no-manual/no-custom; the separate `analytics.sendAnalytics` action uses the same consent/NO_EXTERNAL_CONNECTION-gated SQL CAS/idempotency service, without bypassing job controls or duplicating sends in #25 presentation.
- [ ] Weekly/run-on-start icon job invokes #115's transactional sync; minute ping preserves approved registry clear/dedup/status or explicitly approved retirement while #35's authorized direct app ping remains intact. Updates/statistics are not extra cron jobs.
- [ ] Disabled-provider SQL sessions clean before schedule initialization/run-on-start under the approved failure/readiness policy, distinct from encrypted integration sessions; singleton startup and migration readiness never run competing schedulers.
- [ ] Keyed status initial fetch/subscription/reconnect cannot regress newer jobs; UI gives actionable running/error/forbidden/invalid-interval feedback, separates durable config from execution status and repairs interrupted running without reporting false success.
- [ ] Owned timers/runs/status subscriptions stop/abort/drain and restart under approved overlap/retry/catch-up rules; future focused restriction/persistence/reconnect/interruption evidence exercises actual jobs with disposable effects rather than claiming async void callbacks provide exactly-once execution.

## Coverage

Merged **CORE-06 + OPS-02**, OPS-09 analytics-body transfer: `cronJobs.triggerJob/startJob/stopJob/updateJobInterval/disableJob/enableJob/getJobs/subscribeToStatusUpdates`, `analytics.sendAnalytics`; `cronJobConfigurations`, SchedulerService/JobStatusStore/local registry, exactly analytics/iconsUpdater/ping and disabled-provider SQL cleanup. Evidence: [core CORE-06](../drafts/core.md), [extended OPS-02/OPS-09](../drafts/extended.md), [persistence §5](../../../research_notes/Homarr%20full%20Nitro%20migration/persistence-background.md).

## Required contracts

#01 lifecycle/mount; #02 schedule/session transaction/readiness; #03 common state/fanout; #04 admin; #09 enabled-provider config; #17 analytics consent/CAS; #115 icon-sync; #35 direct-ping boundary; #124 keyed event delivery and #25 manual analytics presentation; #05/#08 forms/notifications as used. Review each consumed revision; no complete-provider or all-ops barrier.

## Decision holds

Schedule overlap/retry/catch-up, interrupted-run repair, startup cleanup failure readiness, ping registry retirement and analytics manual-send idempotency require explicit dispositions. **Q14** affects status streaming, Q11 concrete SQL. No distributed/replica policy is needed under the settled singleton, and no fourth task is invented.

## Ownership

Exclusive scheduler/job registry/status/service/UI and analytics network/body owner; #115 icon internals, #17 consent/settings, #25 presentation. COMPOSITION alone mounts startup/drain. Dispatch needs applicable choices, accepted interfaces and exclusive allocation; publication schedules nothing.
