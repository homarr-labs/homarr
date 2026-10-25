# Grounded repair notes

This is a repair of `candidate-final/reply.md`, using its frozen prompt and the authoritative fixture, not a standalone quality benchmark.

- `app/RESULTS.md` records that the actual Empty preview sets `data.overview` to an empty array while the prior request status remains successful, producing blank metrics and `NaN GiB` (lines 63–66). The overview now renders only when its summary, capacity, status, timestamp, and every displayed summary/capacity number are present with the expected types; otherwise it shows a clear no-data alert. Empty service, incident, and history arrays remain valid and retain their per-tab empty states.
- The fixture maps the incident's affected service ID `photos` to `services[].name` “Family photos” (`response.json`, lines 14–29 and 64–74). Incident rows resolve IDs through the returned services and fall back to the raw ID if it is unknown.
- `app/RESULTS.md` records the actual helper warning for `RefreshButton request` and confirms refresh did refetch (lines 37–43). The helper now uses the verified `requestId` prop while retaining exactly one refresh for the sole load request.
- The fixture's synthetic fractional `errorRate` is `0.014` (`response.json`, line 12), so the summary displays `1.4%`. Disk capacity is converted to TiB; memory remains GiB. ISO timestamps retain their UTC `Z` marker without appending redundant `UTC`.
- All summary values, capacity fields, service fields, incident details, and all returned history points remain reachable in the existing tabs and tables; the request/error chart remains bound to the returned history. The widget still uses only the supplied unauthenticated GET overview request.

No app lifecycle, preview, persistence, or render verification was performed for this repair; the parent session will perform the actual app verification.
