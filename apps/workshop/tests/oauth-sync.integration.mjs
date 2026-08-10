const baseUrl = process.env.WORKSHOP_TEST_URL ?? "http://127.0.0.1:18090";
const expectedClientId = process.env.EXPECTED_GITHUB_CLIENT_ID;
if (!expectedClientId) throw new Error("EXPECTED_GITHUB_CLIENT_ID is required");

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body;
};

const root = await request("/api/collections/_superusers/auth-with-password", {
  method: "POST",
  body: JSON.stringify({ identity: "workshop-test@example.invalid", password: "WorkshopLocalTest123!" }),
});
const users = await request("/api/collections/users", {
  headers: { authorization: `Bearer ${root.token}` },
});
const github = users.oauth2?.providers?.find((provider) => provider.name === "github");
if (!users.oauth2?.enabled || github?.clientId !== expectedClientId) {
  throw new Error(`GitHub OAuth was not synchronized for ${expectedClientId}`);
}
if (
  users.oauth2?.mappedFields?.username !== "githubUsername" ||
  users.oauth2?.mappedFields?.id ||
  users.oauth2?.mappedFields?.name ||
  users.oauth2?.mappedFields?.avatarURL
) {
  throw new Error(`GitHub OAuth field mapping was not synchronized: ${JSON.stringify(users.oauth2?.mappedFields)}`);
}

console.log(`Workshop OAuth synchronization passed for ${expectedClientId}`);
