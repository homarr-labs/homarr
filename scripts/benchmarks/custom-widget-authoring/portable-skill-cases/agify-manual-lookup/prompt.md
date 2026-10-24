---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write]
---

Create a polished age-estimation lookup widget powered by Agify. Let the user enter a full name, manually run the prediction, optionally scope it with a two-letter country code, and clearly explain the estimate and evidence count without presenting it as certainty. Include thoughtful initial, loading, no-result, error, and success states.

API notes I verified: Use https://api.agify.io. Authentication is an API key supplied through the source as apiKeyQuery with query parameter name apikey; never embed it. The manual GET / request receives name from {param:name} and an optional country_id from {param:country}. A successful response has name, age (integer or null), count, and optionally country_id.
Docs: https://agify.io/documentation/api/reference

Sample responses from my instance:

Sample response:

```json
{
  "name": "michael",
  "age": 58,
  "count": 108496,
  "country_id": "US"
}
```

Homarr isn't connected to this chat, so give me the widget definition to import.
