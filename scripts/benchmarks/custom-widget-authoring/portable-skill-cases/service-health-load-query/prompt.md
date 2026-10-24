---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write]
---

Using the supplied fake API contract, create a polished service-health widget for a small homelab. Prioritize the overall state, incident count, latency, last check time, and a compact list of services. It must be immediately useful in narrow and wide dashboard tiles.

API notes I verified: This is a deterministic fake API. Use https://status.example.test with no authentication. GET /v1/health returns the exact sample response. Do not invent additional endpoints or actions.
Docs: https://status.example.test/docs

Sample responses from my instance:

Sample response:

```json
{
  "status": "degraded",
  "checkedAt": "2026-08-10T12:00:00Z",
  "latencyMs": 184,
  "openIncidents": 1,
  "services": [
    {
      "id": "media",
      "name": "Media",
      "status": "operational",
      "latencyMs": 42
    },
    {
      "id": "photos",
      "name": "Photos",
      "status": "degraded",
      "latencyMs": 331
    },
    {
      "id": "dns",
      "name": "DNS",
      "status": "operational",
      "latencyMs": 8
    }
  ]
}
```

Homarr isn't connected to this chat, so give me the widget definition to import.
