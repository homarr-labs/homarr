const baseUrl = process.env.WORKSHOP_TEST_URL ?? "http://127.0.0.1:18091";
const publicWorkshopUrl = process.env.EXPECTED_WORKSHOP_WEB_URL ?? "https://v2.preview.homarr.dev/workshop";
const publicApiUrl = process.env.EXPECTED_WORKSHOP_API_URL ?? "https://v2.preview.homarr.dev";

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body;
};

const root = await request("/api/collections/_superusers/auth-with-password", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ identity: "workshop-image@example.invalid", password: "WorkshopImageTest123!" }),
});
const headers = { authorization: `Bearer ${root.token}` };
const author = await request("/api/collections/users/records", {
  method: "POST",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({
    email: "social-author@example.invalid",
    password: "WorkshopSocialTest123!",
    passwordConfirm: "WorkshopSocialTest123!",
    name: "social-author",
  }),
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const data = new FormData();
data.set("type", "customCss");
data.set("title", "Ocean <Glow>");
data.set("description", "Calm & readable.");
data.set("widgetSchema", "homarr-custom-css-v1");
data.set("content", "body { color: white; }");
data.set("author", author.id);
data.set("screenshots", new File([png], "preview.png", { type: "image/png" }));
const submission = await request("/api/collections/submissions/records", { method: "POST", headers, body: data });
const screenshot = encodeURIComponent(submission.screenshots[0]);
const html = await fetch(`${baseUrl}/workshop/${submission.id}`).then((response) => response.text());

for (const expected of [
  "<title>Ocean &lt;Glow&gt; · Homarr Workshop</title>",
  'property="og:description" content="Custom CSS for Homarr. Calm &amp; readable."',
  `rel="canonical" href="${publicWorkshopUrl}/${submission.id}"`,
  `property="og:image" content="${publicApiUrl}/api/files/submissions/${submission.id}/${screenshot}"`,
  'name="twitter:card" content="summary_large_image"',
  'property="article:section" content="Custom CSS"',
]) {
  if (!html.includes(expected)) throw new Error(`Rendered Workshop page is missing social metadata: ${expected}`);
}

console.log("Workshop social metadata integration passed");
