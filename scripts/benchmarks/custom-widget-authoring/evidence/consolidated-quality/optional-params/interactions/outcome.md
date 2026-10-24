# Optional-country running-app verification

## Outcome

Run 1 passes the requested optional-parameter behavior. Run 2 passes blank/US request selection and has no undefined/null-parameter error, but fails actionable invalid-country feedback: it submits `U` (and an overlength `USA` UI event) and displays only `HTTP 422: Unprocessable Entity` with Retry request, despite the upstream response containing `Use a two-letter country code, such as US.`

| Case | Run 1: Agify Age Estimate | Run 2: Age Estimate |
| --- | --- | --- |
| Name `Michael`, country blank | `estimate`, params `{ "name": "Michael" }`; upstream country key absent; 200; age 42 | `predict`, params `{ "name": "Michael" }`; upstream country key absent; 200; age 42 |
| Country `US` | `estimateCountry`, params `{ "name": "Michael", "country": "US" }`; upstream `country_id=US`; 200; age 39 | `predictByCountry`, same params; upstream `country_id=US`; 200; age 39 |
| Country `U` | Trigger absent; orange “Check the country code / Use a two-letter country code, such as US.”; no request | Trigger remains before click; submits `country_id=U`; upstream 422; generic HTTP error only |
| Normal entry of `USA` | Browser `maxLength=2` keeps `US`; no request until clicked | Browser `maxLength=2` keeps `US`; no request until clicked |
| Explicit `USA` input event, bypassing only native length enforcement | Trigger absent; same actionable two-letter hint; no request | Trigger remains before click; submits `country_id=USA`; upstream 422; generic HTTP error only |
| Undefined/null invocation parameters | None observed | None observed |

The overlength event used the native input value setter plus a bubbling `input` event. It did not modify the template, input attributes, renderer, or component state directly. Normal three-letter typing/fill was tested separately and cannot retain the third character.

The successful responses' SuperJSON metadata can contain the word `undefined` for an absent response error. This is serialization metadata, not a parameter error; normalized invocation params contain neither undefined nor null.

## Fixture scope

- The enclosing single-item widgets.json array was unwrapped for that import. Neither original artifact was changed.
- Only definition substitution: `sources.default.baseUrl`, from `https://api.agify.io` to `http://127.0.0.1:3903`, configured in the UI import dialog. Auth type `apiKeyQuery` and query key `apikey` were preserved.
- Each import received a fresh synthetic API key generated privately for the loopback fixture. No real API key or live Agify request was used. Secret-bearing request bodies were intentionally excluded from browser logs.
- Captures: desktop 1440×1100, existing dark theme. Fixture returns `{name, age:42, count:12345}` without country, age 39 with valid country, and HTTP 422 plus a two-letter guidance JSON error for invalid country lengths.
