const endpoint = "https://openrouter.ai/api/v1/responses";

export const defaultReleaseNotesModel = "openai/gpt-6.1-sol";

const releaseNotesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["body", "discord", "art"],
  properties: {
    body: { type: "string" },
    discord: {
      type: "object",
      additionalProperties: false,
      required: ["title", "summary", "highlights"],
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        highlights: { type: "array", items: { type: "string" } },
      },
    },
    art: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slug", "oneLiner", "screenshotUrl"],
        properties: {
          slug: { type: "string" },
          oneLiner: { type: "string" },
          screenshotUrl: { type: ["string", "null"] },
        },
      },
    },
  },
};

const extractOutputText = (response) => {
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text") return part.text;
    }
  }
  throw new Error("OpenRouter response contained no output_text");
};

export async function requestReleaseNotes({ apiKey, model, instructions, input, repository, signal }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `https://github.com/${repository}`,
      "X-Title": "Homarr release notes",
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      reasoning: { effort: "high" },
      max_output_tokens: 32000,
      text: {
        format: {
          type: "json_schema",
          name: "release_notes",
          strict: true,
          schema: releaseNotesSchema,
        },
      },
      provider: { require_parameters: true },
    }),
    signal,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter responded ${response.status}: ${responseText.slice(0, 500)}`);
  }

  const data = JSON.parse(responseText);
  if (data.status && data.status !== "completed") {
    const detail = JSON.stringify(data.error ?? data.incomplete_details ?? null);
    throw new Error(`OpenRouter response ended as ${data.status}: ${detail}`);
  }

  const parsed = JSON.parse(extractOutputText(data));
  if (typeof parsed.body !== "string" || parsed.body.trim() === "") {
    throw new Error("OpenRouter response had an empty body");
  }

  return {
    model: data.model ?? model,
    usage: data.usage ?? null,
    notes: {
      body: parsed.body.trim(),
      discord: {
        title: String(parsed.discord?.title ?? ""),
        summary: String(parsed.discord?.summary ?? ""),
        highlights: (parsed.discord?.highlights ?? []).filter((highlight) => typeof highlight === "string"),
      },
      art: Array.isArray(parsed.art) ? parsed.art : [],
    },
  };
}
