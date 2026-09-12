/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/workshop/package-releases", (event) => {
  const info = event.requestInfo();
  if (!info.auth) throw new UnauthorizedError("Sign in to publish widget packages");
  const body = info.body;
  const source = body.source;
  if (!source || source.$schema !== "homarr-widget-package-v3" || !source.manifest || !source.files) {
    throw new BadRequestError("Expected a v3 widget source package");
  }
  const manifest = source.manifest;
  if (
    !/^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(manifest.id) ||
    !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/.test(manifest.version) ||
    manifest.sdkVersion !== "1"
  ) {
    throw new BadRequestError("Invalid widget package identity or SDK version");
  }
  if (!manifest.entrypoints || !Object.prototype.hasOwnProperty.call(source.files, manifest.entrypoints.tile)) {
    throw new BadRequestError("The package must contain its tile entrypoint");
  }
  const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === "object") {
      const result = {};
      for (const key of Object.keys(value).sort()) result[key] = canonical(value[key]);
      return result;
    }
    return value;
  };
  const content = JSON.stringify(canonical(source));
  if (content.length > 20_000_000) throw new BadRequestError("Widget source exceeds 20 MB");
  const sourceDigest = $security.sha256(content);
  let artifact = "";
  let artifactDigest = "";
  if (body.artifact) {
    const supplied = body.artifact;
    if (supplied.format !== "homarr-widget-artifact-v3" || supplied.sourceDigest !== sourceDigest) {
      throw new BadRequestError("Artifact does not identify the supplied source package");
    }
    const contents = {};
    for (const key of Object.keys(supplied)) if (key !== "digest") contents[key] = supplied[key];
    artifactDigest = $security.sha256(JSON.stringify(canonical(contents)));
    if (artifactDigest !== supplied.digest) throw new BadRequestError("Artifact checksum mismatch");
    artifact = JSON.stringify(supplied);
    if (artifact.length > 80_000_000) throw new BadRequestError("Artifact exceeds 80 MB");
  }
  let created;
  event.app.runInTransaction((app) => {
    let submission;
    if (body.submissionId) {
      submission = app.findRecordById("submissions", String(body.submissionId));
      if (submission.getString("author") !== info.auth.id)
        throw new ForbiddenError("Only the author can publish a release");
      if (submission.getString("widgetSchema") !== source.$schema)
        throw new BadRequestError("Create a separate package submission for v3");
      if (Number(body.expectedRevision) !== submission.getInt("revision"))
        throw new BadRequestError("Submission changed since it was read");
      const previous = JSON.parse(submission.getString("content"));
      if (previous.manifest.id !== manifest.id) throw new BadRequestError("A release must retain its package identity");
      const current = submission.getInt("revision");
      submission.set("expectedRevision", current);
      submission.set("revision", current + 1);
    } else {
      submission = new Record(app.findCollectionByNameOrId("submissions"));
      submission.set("type", "customWidget");
      submission.set("widgetSchema", source.$schema);
      submission.set("author", info.auth.id);
      submission.set("revision", 1);
      submission.set("expectedRevision", 0);
    }
    submission.set("title", String(body.title || manifest.name || manifest.id));
    submission.set("description", String(body.description ?? manifest.description ?? ""));
    submission.set("content", content);
    submission.set("changelog", String(body.changelog || ""));
    submission.set("outdated", false);
    app.save(submission);
    const release = new Record(app.findCollectionByNameOrId("widget_releases"));
    release.set("submission", submission.id);
    release.set("author", info.auth.id);
    release.set("packageId", manifest.id);
    release.set("version", manifest.version);
    release.set("sdkVersion", manifest.sdkVersion);
    release.set("content", content);
    release.set("sourceDigest", sourceDigest);
    release.set("artifact", artifact);
    release.set("artifactDigest", artifactDigest);
    release.set("changelog", String(body.changelog || ""));
    if (body.forkedFrom) {
      const origin = app.findRecordById("widget_releases", String(body.forkedFrom));
      if (origin.getString("packageId") === manifest.id) throw new BadRequestError("A fork needs its own package ID");
      release.set("forkedFrom", origin.id);
    }
    app.save(release);
    created = release;
  });
  return event.json(201, created);
});

onRecordCreateRequest((event) => {
  if (event.record.getString("widgetSchema") === "homarr-widget-package-v3") {
    throw new BadRequestError("Publish v3 packages through the package release endpoint");
  }
  event.next();
}, "submissions");

onRecordUpdateRequest((event) => {
  if (
    event.record.original().getString("widgetSchema") === "homarr-widget-package-v3" &&
    event.record.getString("content") !== event.record.original().getString("content")
  ) {
    throw new BadRequestError("Published package source is immutable; publish a new release");
  }
  event.next();
}, "submissions");
