---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write]
---

A Seerr request-operations widget with asymmetric Total/Pending priority plus quieter Approved/Available and processing/declined context, independently recoverable count/queue failures, subtle cached refresh context, divider-based rows with a pending accent, a narrow-first two-level queue, non-duplicated request/media identity, accessible requester/avatar and Media profile context, compact Created/Profile and Media/4K groups, readable request state, UTC time, truthful total-results page context, refresh, confirmed approve/decline for pending requests, and complete loading, empty, error, and success states.

API notes I verified: Use the suggested self-hosted source http://seerr.local:5055/api/v1 with X-Api-Key header authentication. GET /request/count returns total, movie, tv, pending, approved, declined, processing, available, and completed counts. GET /request accepts take, skip, filter, sort, sortDirection, requestedBy, and mediaType; use fixed primitives take=10, skip=0, sort=added, and sortDirection=desc. Its response has pageInfo.pages/pageSize/results/page and a results array whose entries include id, type, numeric status, createdAt, profileName, requestedBy.displayName, and media.tmdbId/mediaType/status/status4k. Request status values are 1 Pending, 2 Approved, 3 Declined, 4 Failed, and 5 Completed. For managers, POST /request/{param:requestId}/approve and POST /request/{param:requestId}/decline change a pending request's status without a body; show them only for status 1, confirm both, and invalidate the count and list queries. This scoped widget intentionally uses text pageInfo context and does not require media-title joins, search requests, or interactive pagination. Both media.status and mediaInfo.status/status4k use 1 Unknown, 2 Pending, 3 Processing, 4 Partially Available, 5 Available, 6 Blocklisted, and 7 Deleted. Render readable labels rather than raw codes.
Docs: https://github.com/seerr-team/seerr/blob/develop/seerr-api.yml

Sample responses from my instance:

GET /request/count:

```json
{
  "total": 42,
  "movie": 25,
  "tv": 17,
  "pending": 4,
  "approved": 9,
  "declined": 2,
  "processing": 6,
  "available": 20,
  "completed": 21
}
```

GET /request:

```json
{
  "pageInfo": {
    "pages": 5,
    "pageSize": 10,
    "results": 42,
    "page": 1
  },
  "results": [
    {
      "id": 91,
      "type": "movie",
      "status": 2,
      "createdAt": "2026-08-28T19:22:00.000Z",
      "profileName": "HD-1080p",
      "requestedBy": {
        "id": 7,
        "displayName": "Alex",
        "avatar": "/avatar/alex"
      },
      "media": {
        "tmdbId": 603,
        "mediaType": "movie",
        "status": 3,
        "status4k": 1
      }
    },
    {
      "id": 92,
      "type": "tv",
      "status": 1,
      "createdAt": "2026-08-29T08:05:00.000Z",
      "requestedBy": {
        "id": 8,
        "displayName": "Sam",
        "avatar": "/avatar/sam"
      },
      "media": {
        "tmdbId": 1399,
        "mediaType": "tv",
        "status": 2,
        "status4k": 1
      }
    }
  ]
}
```

POST /request/{param:requestId}/approve:

```json
{
  "id": 91,
  "status": 2,
  "type": "movie",
  "modifiedBy": {
    "displayName": "Admin"
  }
}
```

POST /request/{param:requestId}/decline:

```json
{
  "id": 91,
  "status": 3,
  "type": "movie",
  "modifiedBy": {
    "displayName": "Admin"
  }
}
```

Homarr isn't connected to this chat, so give me the widget definition to import.
