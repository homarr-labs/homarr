# 94 — Provider/model configuration

## What to build
Deliver administrator configuration → bounded discovery/manual model selection → safe authenticated runtime choices, backed by authorized services and durable settings. Hosted identity is a consumer join, not a prerequisite to configuring custom/local providers.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary key ASSISTANT-01. Presets: homarr, openrouter, openai, anthropic, google-gemini, xai, groq, mistral, deepseek, together, ollama, lm-studio, llama-cpp, custom. Preserve local/custom URLs, custom headers, OpenRouter options, enablement, context entities, manual model IDs and capability-dependent choices. Primary leaves: assistant.getAvailability, getContextEntities, getModelCapabilities, getRuntimeOptions, getAdminConfiguration, updateConnection, clearCredentials, discoverModels, updateConfiguration (9). Own Assistant management page. Behavior model: assistantConfigurations, including encryptedApiKey/encryptedHeaders; #02 owns physical schema and #112 complete cross-key conversion. Vendor names do not imply unsupported model capabilities.

## Required contracts
Initially unaccepted: #01 request/abort and local contribution port; #04 admin/authenticated policy and encrypted-value references; #02 configuration repository/transaction/errors; #03 bounded discovery cache/invalidation; #120 typed client/error mapping; #05–08 scoped locale/form ports. Supply #95/#96 model/credential/capability interfaces. #108 supplies the separate hosted-account/token contract only for homarr.

## Decision holds
Exact AI SDK/provider/client versions and installed/catalog coherence need evidence, not assumed approval. Q11/Q12 hold concrete persistence/conversion choices. Detailed locale behavior and provider error/freshness policy remain held only where needed. No finished chat or hosted-login dependency is invented.

## Ownership
Own feature-local provider configuration, services, descriptors, management UI and focused evidence. COMPOSITION owns root, registrations, exports, manifests and lockfile. Production acceptance joins real policy, persistence and transport; hosted acceptance additionally joins #108. Whole-product convergence is #125, not a start barrier.

## Acceptance criteria
- [ ] Every named preset round-trips durable destination/model/settings through the target management client; 15-second discovery timeout and ten-minute cache, or explicitly reviewed replacements, give actionable failure and manual fallback without erasing content.
- [ ] Admin writes and authenticated safe availability/context/model/runtime reads enforce current authorization before secret resolution; HTML, bootstrap, diagnostics and errors contain no API key/header plaintext.
- [ ] Destination changes disable incompatible selection and clear incompatible credential bindings; explicit clear and safe configured flags survive reload, including custom headers and old-content conversion.
- [ ] Client and service reject model-incompatible image/search/context choices using typed capability/error results; focused future denial, discovery-failure and binding-change regressions use disposable data without paid calls.
