const enabled = process.env.HOMARR_AI_LIVE_SMOKE === "1";
if (!enabled)
  throw new Error("Set HOMARR_AI_LIVE_SMOKE=1 to acknowledge that this check consumes a real provider request");

const baseUrl = process.env.WORKSHOP_LIVE_TEST_URL?.replace(/\/+$/u, "");
const token = process.env.WORKSHOP_LIVE_TEST_TOKEN;
if (!baseUrl || !token) {
  throw new Error("WORKSHOP_LIVE_TEST_URL and WORKSHOP_LIVE_TEST_TOKEN are required");
}

const requestJson = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...init.headers },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return { body, headers: response.headers };
};

const { body: models } = await requestJson("/api/ai/v1/models");
if (models.data?.length !== 1 || models.data[0]?.id !== "homarr/model") {
  throw new Error("The live Workshop endpoint did not advertise the stable Homarr model");
}

const { body: before } = await requestJson("/api/ai/usage");
if (before.remaining < 1) throw new Error("The live test user has no remaining Homarr provider allowance");

const { body: completion, headers } = await requestJson("/api/ai/v1/chat/completions", {
  method: "POST",
  body: JSON.stringify({
    model: "homarr/model",
    messages: [{ role: "user", content: "Reply with exactly OK." }],
    stream: false,
  }),
});
if (
  completion.model !== "homarr/model" ||
  typeof completion.choices?.[0]?.message?.content !== "string" ||
  completion.choices[0].message.content.length === 0 ||
  headers.get("x-homarr-quota-remaining") === null
) {
  throw new Error("The live Homarr provider did not return an OpenAI-compatible completion with quota headers");
}

const { body: after } = await requestJson("/api/ai/usage");
if (after.used < before.used + 1 || after.remaining >= before.remaining) {
  throw new Error("The live completion was not charged to the authenticated Workshop user");
}

process.stdout.write("Live Homarr provider smoke test passed\n");
