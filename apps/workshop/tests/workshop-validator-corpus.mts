import { BUNDLED_CUSTOM_WIDGETS, customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";

const baseUrl = process.env.WORKSHOP_TEST_URL ?? "http://127.0.0.1:18090";
const password = "WorkshopCorpus123!";
const shard = Number(process.env.WORKSHOP_CORPUS_SHARD ?? "0");
const shardCount = Number(process.env.WORKSHOP_CORPUS_SHARD_COUNT ?? "1");
if (!Number.isInteger(shard) || !Number.isInteger(shardCount) || shard < 0 || shardCount < 1 || shard >= shardCount) {
  throw new Error("Validator corpus shard configuration is invalid");
}
const email = shardCount === 1 ? "workshop-corpus@example.invalid" : `workshop-corpus-${shard}@example.invalid`;

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { response, body };
}

const root = await request("/api/collections/_superusers/auth-with-password", {
  method: "POST",
  body: JSON.stringify({ identity: "workshop-test@example.invalid", password: "WorkshopLocalTest123!" }),
});
if (!root.response.ok || typeof root.body?.token !== "string") throw new Error("Corpus superuser login failed");
const rootHeaders = { authorization: `Bearer ${root.body.token}` };

const createdUser = await request("/api/collections/users/records", {
  method: "POST",
  headers: rootHeaders,
  body: JSON.stringify({
    email,
    emailVisibility: false,
    verified: true,
    password,
    passwordConfirm: password,
    displayName: "Validator Corpus",
  }),
});
if (!createdUser.response.ok || typeof createdUser.body?.id !== "string") {
  throw new Error(`Corpus user creation failed: ${JSON.stringify(createdUser.body)}`);
}
const userId = createdUser.body.id;

const signedIn = await request("/api/collections/users/auth-with-password", {
  method: "POST",
  body: JSON.stringify({ identity: email, password }),
});
if (!signedIn.response.ok || typeof signedIn.body?.token !== "string") throw new Error("Corpus user login failed");
const userHeaders = { authorization: `Bearer ${signedIn.body.token}` };

const bundled = BUNDLED_CUSTOM_WIDGETS.map(({ id, widget }) => ({
  name: `bundled:${id}`,
  widget: structuredClone(widget) as Record<string, unknown>,
}));
const base = structuredClone(bundled[0]?.widget);
if (!base) throw new Error("Bundled Custom Widget corpus is empty");

const asRecord = (value: unknown) => value as Record<string, unknown>;
const withMutation = (mutate: (widget: Record<string, unknown>) => void) => {
  const widget = structuredClone(base) as Record<string, unknown>;
  mutate(widget);
  return widget;
};

bundled.push(
  {
    name: "source:valid-port-zero",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "http://example.com:0";
    }),
  },
  {
    name: "source:valid-trailing-dot",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "https://example.com.";
    }),
  },
  {
    name: "source:valid-idn",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "https://münich.example";
    }),
  },
  {
    name: "url:valid-ipv6-and-port",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "https://[2001:db8::1]:65535";
      widget.iconUrl = "https://[2001:db8::1]:65535/icon.svg";
    }),
  },
  {
    name: "request:valid-harmless-key-metadata",
    widget: withMutation((widget) => {
      const requestDefinition = asRecord(Object.values(asRecord(widget.requests))[0]);
      requestDefinition.path = "/api/status?key=status&auth=none";
      requestDefinition.headers = {
        Accept: "application/json",
        "X-Api-Version": "2026-07",
        "X-Feature-Key": "dashboard-layout",
      };
    }),
  },
);

const adversarial = [
  {
    name: "manifest:unknown-secret-field",
    widget: withMutation((widget) => {
      widget.secrets = [{ value: "must-never-be-published" }];
    }),
  },
  {
    name: "source:embedded-credentials",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "https://user:password@example.com";
    }),
  },
  {
    name: "source:invalid-numeric-host",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "http://1.2.3.4.5";
    }),
  },
  {
    name: "source:invalid-numeric-leading-zero",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "http://09.0.0.1";
    }),
  },
  {
    name: "source:ambiguous-numeric-shorthand",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "http://127.1";
    }),
  },
  {
    name: "source:ambiguous-hexadecimal-ipv4",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "http://0x7f000001";
    }),
  },
  {
    name: "source:percent-encoded-host",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "https://%65xample.com";
    }),
  },
  {
    name: "source:backslash-normalization",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "https://example.com\\@attacker.invalid";
    }),
  },
  {
    name: "source:invalid-ipv6-zone",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "http://[fe80::1%25eth0]";
    }),
  },
  {
    name: "source:invalid-ipv6-embedded-ipv4",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "http://[::ffff:192.168.001.001]";
    }),
  },
  {
    name: "source:invalid-a-label",
    widget: withMutation((widget) => {
      asRecord(asRecord(widget.sources).default).baseUrl = "https://xn--a.example";
    }),
  },
  {
    name: "request:reserved-header",
    widget: withMutation((widget) => {
      const requestDefinition = asRecord(Object.values(asRecord(widget.requests))[0]);
      requestDefinition.headers = { Authorization: "must-never-be-published" };
    }),
  },
  {
    name: "request:credential-in-body",
    widget: withMutation((widget) => {
      const requestDefinition = asRecord(Object.values(asRecord(widget.requests))[0]);
      requestDefinition.body = { access_token: "must-never-be-published" };
    }),
  },
  {
    name: "request:credential-in-path-query",
    widget: withMutation((widget) => {
      const requestDefinition = asRecord(Object.values(asRecord(widget.requests))[0]);
      requestDefinition.path = "/api/status?credential=Bearer-sk-secret-123456";
    }),
  },
  {
    name: "request:credential-in-custom-header",
    widget: withMutation((widget) => {
      const requestDefinition = asRecord(Object.values(asRecord(widget.requests))[0]);
      requestDefinition.headers = { "X-Auth": "Bearer sk-secret-123456" };
    }),
  },
  {
    name: "request:common-token-in-header-value",
    widget: withMutation((widget) => {
      const requestDefinition = asRecord(Object.values(asRecord(widget.requests))[0]);
      requestDefinition.headers = { "X-Service": "ghp_abcdefghijklmnopqrstuvwxyz123456" };
    }),
  },
  {
    name: "request:automatic-delete-query",
    widget: withMutation((widget) => {
      const requestDefinition = asRecord(Object.values(asRecord(widget.requests))[0]);
      requestDefinition.kind = "query";
      requestDefinition.trigger = "load";
      requestDefinition.method = "DELETE";
    }),
  },
  {
    name: "icon:credential-query",
    widget: withMutation((widget) => {
      widget.iconUrl = "https://example.com/icon.png?clientSecret=must-never-be-published";
    }),
  },
  {
    name: "icon:unicode-mapped-numeric-host",
    widget: withMutation((widget) => {
      widget.iconUrl = "https://１２７.０.０.１/icon.png";
    }),
  },
  {
    name: "option:invalid-default",
    widget: withMutation((widget) => {
      asRecord(widget.options).invalid = { label: "Invalid", control: "number", default: "not-a-number" };
    }),
  },
  {
    name: "template:incompatible-request",
    widget: withMutation((widget) => {
      const requestId = Object.keys(asRecord(widget.requests))[0];
      widget.template = `${String(widget.template)}<ActionButton requestId="${requestId}">Unsafe</ActionButton>`;
    }),
  },
  {
    name: "template:literal-credential",
    widget: withMutation((widget) => {
      widget.template = "<Text>Authorization: Bearer must-never-be-published</Text>";
    }),
  },
  {
    name: "template:blocked-script",
    widget: withMutation((widget) => {
      widget.template = "<script>unsafe()</script>";
    }),
  },
  {
    name: "template:unknown-component",
    widget: withMutation((widget) => {
      widget.template = "<DefinitelyNotAWidgetComponent />";
    }),
  },
  {
    name: "template:unknown-global",
    widget: withMutation((widget) => {
      widget.template = "<Text>{process.env.HOME}</Text>";
    }),
  },
];

let updateTargetId: string | undefined;
let updateTargetRevision = 0;
for (const [index, entry] of bundled.entries()) {
  const canonicalAccepted = customWidgetDefinitionSchema.safeParse(entry.widget).success;
  if (!canonicalAccepted) throw new Error(`Bundled widget failed canonical validation: ${entry.name}`);
  const direct = updateTargetId
    ? await request(`/api/collections/submissions/records/${updateTargetId}`, {
        method: "PATCH",
        headers: userHeaders,
        body: JSON.stringify({
          title: `Corpus ${String(index + 1).padStart(2, "0")}`,
          description: entry.name,
          content: JSON.stringify(entry.widget),
          expectedRevision: updateTargetRevision,
        }),
      })
    : await request("/api/collections/submissions/records", {
        method: "POST",
        headers: userHeaders,
        body: JSON.stringify({
          type: "customWidget",
          title: `Corpus ${String(index + 1).padStart(2, "0")}`,
          description: entry.name,
          widgetSchema: "caller-controlled",
          content: JSON.stringify(entry.widget),
          author: userId,
        }),
      });
  if (!direct.response.ok || typeof direct.body?.id !== "string") {
    throw new Error(
      `PocketBase rejected bundled widget ${entry.name}: status=${direct.response.status}, body=${JSON.stringify(direct.body)}`,
    );
  }
  updateTargetId ??= direct.body.id;
  if (typeof direct.body.revision !== "number") throw new Error("Corpus response did not include a numeric revision");
  updateTargetRevision = direct.body.revision;
}

if (!updateTargetId) throw new Error("Differential corpus did not create an update target");
const adversarialShard = adversarial.filter((_, index) => index % shardCount === shard);
for (const entry of adversarialShard) {
  if (customWidgetDefinitionSchema.safeParse(entry.widget).success) {
    throw new Error(`Adversarial corpus case passed canonical validation: ${entry.name}`);
  }
  const direct = await request(`/api/collections/submissions/records/${updateTargetId}`, {
    method: "PATCH",
    headers: userHeaders,
    body: JSON.stringify({
      content: JSON.stringify(entry.widget),
      expectedRevision: updateTargetRevision,
    }),
  });
  if (direct.response.status === 429) {
    throw new Error(`Validator corpus was rate limited before checking ${entry.name}`);
  }
  if (direct.response.status !== 400) {
    throw new Error(
      `PocketBase accepted or mishandled invalid widget ${entry.name}: status=${direct.response.status}, body=${JSON.stringify(direct.body)}`,
    );
  }
}

console.log(
  `Workshop validator differential corpus shard ${shard + 1}/${shardCount} passed (${bundled.length + adversarialShard.length} cases)`,
);
