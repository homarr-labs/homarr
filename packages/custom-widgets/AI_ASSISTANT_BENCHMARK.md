# Assistant prompt benchmark — 2026-09-20

This experiment evaluated pass@1 Custom Widget authoring with `z-ai/glm-5.3-flash` through OpenRouter. It used synthetic requests and fixtures only. The production assistant prompt was not changed because the selected dev candidate regressed on the held-out split.

## Fixed configuration

- Temperature: `0.2`
- Reasoning: `medium`, excluded from output
- Generator output limit: `16384`
- Judge output limit: `4096`
- Attempts per case: `1`
- Harness: `2a7f24a0dde4bbd04b980c3717c46de051cd7df615459190b57d83903ef7531c`
- Judge policy: `9a43c2b5f903e2d962761e368a9323b1be5a656aefac17c65da6c34580439f5f`
- Dev cases: `5b077ed6556fe55beeb1acc1a6f90f403f195347cd15dddedaccb202b28d8332`
- Held-out cases: `35ab89472f4589c6e581001d073160f1d604b4174dea276ca8aaeb8a67c100b3`

The first benchmark wave was discarded after the judge returned `400` because reasoning had been disabled for a model that requires it. All numbers below come from corrected runs with identical configuration hashes inside each split.

## Dev generations

| Generation | Prompt SHA-256                                                     | Mean | Pass rate | Lifecycle | Tools/case | Generator tokens/case |
| ---------- | ------------------------------------------------------------------ | ---: | --------: | --------: | ---------: | --------------------: |
| 0 baseline | `870688428753a3cefc6972d837c8ba362569f8e2f60028281f89a9252ff9e52d` |    0 |        0% |        0% |       8.25 |             46,825.25 |
| 1          | `3410a052d22163b14c818ae2b805078d67aed9c9b41ae1355025d21fa20405c9` |    0 |        0% |        0% |         11 |             69,065.25 |
| 2          | `431e54ac3f906b66b5b95f13078c98060dd68a1890a73f5de72208144819591f` |    0 |        0% |        0% |       9.75 |             55,546.25 |
| 3          | `9ef9f05a89aac1d981954fc76c795d73a0d0046fc85625763c060f88e4f41f86` |   21 |        0% |       25% |       25.5 |            144,842.75 |
| 4          | `fdaf54a1978c60fbc8b349440cec28020f1b870aee86923a4d1b0eb88155c859` | 16.5 |        0% |       25% |         10 |             53,073.25 |
| 5          | `97701aab9dedb3731d6b86c804a9487f335b48889c069f4b9ee2ff6fe199f4cf` |    0 |        0% |        0% |       8.25 |                47,939 |
| 6          | `1de52e612f9c89ff529281b3419dd70c7c37f18f97660953b3dc364b697997d9` |   41 |        0% |       50% |       10.5 |             60,622.25 |
| 7          | `04c1c4b1b9a93515a6d2f61bcc10dae9f7a4528615f42e004448a9dbf660bd1a` |    0 |        0% |        0% |      10.25 |             59,725.75 |
| 8 selected | `127d18739f73642d41dafdeb5305a683bcea483c53257125dbcfea35d7e6426c` | 21.5 |       25% |       25% |       8.25 |             41,772.25 |
| 9          | `659f5b061556cf5d77012ce13c2306ea1adc49ab12981f99356d4ee1d9c55969` |   20 |        0% |       25% |       10.5 |                65,886 |
| 10         | `bdabb0cd0734303930bc57952e569712da7b34398f574d79917300e951a4de58` |    0 |        0% |        0% |        8.5 |             48,999.75 |

Generation 8 was selected because it produced the only strict dev pass. Generation 6 had the strongest mean and lifecycle completion but no strict passes and regressed sequential lifecycle tool use.

## One-time held-out result

| Prompt       | Mean | Pass rate | Lifecycle | Tools/case | Generator tokens/case |
| ------------ | ---: | --------: | --------: | ---------: | --------------------: |
| Baseline     |   42 |        0% |       50% |      10.25 |              61,397.5 |
| Generation 8 |   21 |        0% |       25% |      10.75 |                68,034 |

Generation 8 failed promotion: mean decreased by 21 points and lifecycle completion decreased by 25 percentage points. The production prompt therefore remains the baseline.

Across dev and held-out cases combined, generation 8 changed mean from 21 to 21.25, strict passes from 0/8 to 1/8, lifecycle completion remained 2/8, tool calls increased 2.70%, and recorded generator tokens increased 1.46%. These are single pass@1 samples, not confidence intervals.

OpenRouter account usage increased by `$0.820636586` during the experiment. This attribution assumes no unrelated concurrent usage; judge token cost is not present in the harness token totals.
