# `@homarr/common` public API

## Contents

- [Reuse workflow](#reuse-workflow)
- [Entrypoints](#entrypoints)
- [Root exports](#root-exports)
- [Types exports](#types-exports)
- [Server exports](#server-exports)
- [Client and environment exports](#client-and-environment-exports)

## Reuse workflow

Before writing a utility, search both the public name and the behavior:

```bash
rg -n "export (const|function|class|type|interface)|export \*" packages/common
rg -n "@homarr/common" apps packages
```

Import only from an exported package entrypoint. Do not deep-import `@homarr/common/src/*`. Check `packages/common/package.json` and the source again when adding or renaming an export; this inventory describes the current repository tree.

## Entrypoints

| Import                  | Source                       | Environment                                                                         |
| ----------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| `@homarr/common`        | `index.ts` -> `src/index.ts` | Shared root; includes React hooks and some Next/Mantine-aware helpers               |
| `@homarr/common/types`  | `src/types.ts`               | Type-only utilities                                                                 |
| `@homarr/common/server` | `src/server.ts`              | Node/server-only security, encryption, request, error, and bounded-response helpers |
| `@homarr/common/client` | `src/client.ts`              | Client-facing Next server action export                                             |
| `@homarr/common/env`    | `env.ts`                     | Validated package environment                                                       |

## Root exports

| Area              | Public exports                                                                                                                                       | Purpose                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Objects           | `objectKeys`, `objectEntries`, `hashObjectBase64`                                                                                                    | Typed key/entry iteration and stable query-key hashing          |
| Strings           | `capitalize`, `isNullOrWhitespace`, `bestMatch`, `normalizeImageName`, `getImageMatchRank`                                                           | Text normalization and matching                                 |
| Cookies           | `parseCookies`, `setClientCookie`                                                                                                                    | Cookie parsing and browser cookie serialization                 |
| Arrays            | `splitToNChunks`, `splitToChunksWithNItems`                                                                                                          | Split by number of groups or maximum group size                 |
| Dates             | `formatDuration`, `toValidDate`, `isDateWithin`                                                                                                      | Duration formatting, safe date coercion, relative-window checks |
| Timing            | `Stopwatch`                                                                                                                                          | Elapsed-time measurement and formatting                         |
| React hooks       | `useTimeAgo`, `useIntegrationConnected`                                                                                                              | Relative time and integration freshness state                   |
| URLs              | `removeTrailingSlash`, `extractBaseUrlFromHeaders`, `getPortFromUrl`, `isAbsoluteUrl`, `SAFE_NEW_TAB_REL`, `getSafeApplicationUrl`, `getSafeAppHref` | URL normalization, safe navigation, ports, and new-tab policy   |
| Numbers and bytes | `formatNumber`, `randomInt`, `formatBytes`, `formatBytesPair`, `formatByteRate`, `metricToImperial`, `imperialToMetric`                              | Compact numbers, byte displays, rates, and unit conversion      |
| Legacy bytes      | `humanFileSize`                                                                                                                                      | Deprecated; use the `formatBytes*` helpers in new code          |
| Byte types        | `ByteUnitSystem`, `FormatBytesOptions`                                                                                                               | Options for byte formatting                                     |
| Errors            | `extractErrorMessage`, `FlattenError`                                                                                                                | Unknown-error messages and flattenable domain errors            |
| Theme             | `getMantineColor`                                                                                                                                    | Resolve a Mantine color and shade                               |
| Functions         | `isFunction`                                                                                                                                         | Unknown-value function guard                                    |
| Grid              | `GridAlgorithmItem`, `generateResponsiveGridFor`                                                                                                     | Responsive nested-section grid placement                        |
| IDs               | `createId`                                                                                                                                           | CUID2 ID creation                                               |

The root deliberately does not re-export `types`, `server`, `client`, or `env`; use their named entrypoints.

## Types exports

`@homarr/common/types` exports:

- `MaybePromise<T>`
- `AtLeastOneOf<T>`
- `Modify<T, R>`
- `RemoveReadonly<T>`
- `MaybeArray<T>`
- `Inverse<T>`
- `inferSearchParamsFromSchema<TSchema>`

## Server exports

`@homarr/common/server` exports:

- Security: `generateSecureRandomToken`.
- Encryption: `encryptSecret`, `decryptSecret`, `decryptSecretWithKey`, `createKeyedFingerprint`, `verifyKeyedFingerprint`.
- Requests: `userAgent`, `DeviceType`, `ipAddressFromHeaders`.
- Bounded bodies: `readBoundedJsonResponseAsync`.
- Parse errors: `ParseError`, `ParseErrorHandler`, `ZodParseErrorHandler`, `JsonParseErrorHandler`.
- HTTP handlers: `HttpErrorHandler`, `FetchHttpErrorHandler`, `matchErrorCode`, `OFetchHttpErrorHandler`, `AxiosHttpErrorHandler`, `TsdavHttpErrorHandler`, `OctokitHttpErrorHandler`.
- HTTP errors: `RequestError`, `ResponseError`, `requestErrorMap`.
- HTTP error types: `AnyRequestError`, `AnyRequestErrorInput`, `RequestErrorInput`, `RequestErrorType`, `RequestErrorReason`, `AnyRequestErrorReason`, `RequestErrorCode`.

`NodeFetchHttpErrorHandler` exists as an implementation file but is not exported by the public server entrypoint. Add an intentional public export before using it across packages.

## Client and environment exports

- `@homarr/common/client` exports `revalidatePathActionAsync`, a Next server action for page revalidation.
- `@homarr/common/env` exports `env` with validated `NODE_ENV`, `SECRET_ENCRYPTION_KEY`, and `NO_EXTERNAL_CONNECTION` values.
