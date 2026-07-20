const WIDGET_SCHEMA = "homarr-custom-widget-v2";
const AUTH_TYPES = ["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"];
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const NETWORK_SCOPES = ["public", "private", "loopback"];
const PERMISSIONS = ["view", "modify", "full"];
const PARAMETER_TYPES = ["string", "number", "boolean"];
const TOP_LEVEL_FIELDS = [
  "$schema",
  "name",
  "description",
  "iconUrl",
  "sources",
  "requests",
  "optionsSchema",
  "defaultOptions",
  "template",
];
const SOURCE_FIELDS = ["id", "name", "baseUrl", "networkScope", "auth"];
const REQUEST_FIELDS = [
  "id",
  "sourceId",
  "kind",
  "method",
  "pathTemplate",
  "parameters",
  "queryTemplate",
  "bodyTemplate",
  "staticHeaders",
  "auth",
  "minimumBoardPermission",
  "trigger",
  "cacheTtlSeconds",
  "confirmation",
  "invalidates",
];
const OPTION_FIELDS = [
  "type",
  "title",
  "description",
  "default",
  "enum",
  "const",
  "minimum",
  "maximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "format",
  "items",
  "properties",
  "required",
  "additionalProperties",
  "if",
  "then",
  "else",
  "x-homarr",
];
const OPTION_TYPES = ["object", "array", "string", "number", "integer", "boolean", "null"];
const OPTION_CONTROLS = [
  "text",
  "textarea",
  "number",
  "switch",
  "select",
  "multi-select",
  "slider",
  "date",
  "time",
  "color",
  "icon",
  "url",
  "duration",
  "timeZone",
  "json",
];
const OPTION_FORMATS = ["date", "date-time", "time", "color", "uri", "icon", "duration", "time-zone"];
const RESERVED_HEADERS = [
  "authorization",
  "connection",
  "content-length",
  "cookie",
  "expect",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
];
const SENSITIVE_KEY =
  /(^|[-_])(authorization|api[-_]?keys?|passwords?|passwds?|secrets?|tokens?|access[-_]?tokens?|refresh[-_]?tokens?|client[-_]?secrets?)($|[-_])/i;
const CREDENTIAL_TEXT =
  /(?:\bauthorization\s*[:=]\s*["']?bearer\s+[A-Za-z0-9._~+/%-]{8,}|\b(?:api[ _-]?key|access[ _-]?token|refresh[ _-]?token|client[ _-]?secret|token|password|passwd|secret)\s*[:=]\s*["'][^"']{4,}["'])/i;

function bad(message) {
  throw new BadRequestError(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validId(value) {
  return typeof value === "string" && /^[a-z][a-z0-9_-]{0,63}$/.test(value);
}

function validBindingId(value) {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value);
}

function validHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value);
}

function protectedHeader(name) {
  const normalized = name.trim().toLowerCase();
  return (
    RESERVED_HEADERS.includes(normalized) ||
    normalized.startsWith("proxy-") ||
    normalized.startsWith("sec-") ||
    normalized.startsWith("x-forwarded-")
  );
}

function validHeaderName(name) {
  return (
    typeof name === "string" &&
    name.length <= 256 &&
    /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name) &&
    !protectedHeader(name)
  );
}

function hasControlCharacter(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function validateSource(source) {
  if (
    !isObject(source) ||
    Object.keys(source).some((key) => !SOURCE_FIELDS.includes(key)) ||
    !validId(source.id) ||
    typeof source.name !== "string" ||
    !source.name.trim() ||
    source.name.length > 128 ||
    typeof source.baseUrl !== "string" ||
    !NETWORK_SCOPES.includes(source.networkScope) ||
    !isObject(source.auth) ||
    !AUTH_TYPES.includes(source.auth.type)
  )
    bad("Widget contains an invalid source");
  if (!/^https?:\/\/[^/?#\s]+(?:\/[^?#\s]*)?$/i.test(source.baseUrl)) bad("Widget source URL is invalid");
  const authority = source.baseUrl.replace(/^https?:\/\//i, "").split("/")[0];
  if (authority.includes("@")) bad("Widget source URLs must not contain credentials or query values");
  const authFields =
    source.auth.type === "apiKeyHeader"
      ? ["type", "headerName"]
      : source.auth.type === "apiKeyQuery"
        ? ["type", "parameterName"]
        : ["type"];
  if (Object.keys(source.auth).some((key) => !authFields.includes(key))) bad("Widget source authentication is invalid");
  if (source.auth.type === "apiKeyHeader" && !validHeaderName(source.auth.headerName))
    bad("API key authentication requires a safe HTTP header name");
  if (
    source.auth.type === "apiKeyQuery" &&
    (typeof source.auth.parameterName !== "string" ||
      !source.auth.parameterName ||
      source.auth.parameterName.length > 256 ||
      hasControlCharacter(source.auth.parameterName))
  )
    bad("API key query authentication requires a safe parameterName");
}

function validateRequest(request, sourceIds) {
  if (
    !isObject(request) ||
    Object.keys(request).some((key) => !REQUEST_FIELDS.includes(key)) ||
    !validId(request.id) ||
    !sourceIds.has(request.sourceId) ||
    !["query", "action"].includes(request.kind) ||
    !METHODS.includes(request.method) ||
    typeof request.pathTemplate !== "string" ||
    !request.pathTemplate.startsWith("/") ||
    request.pathTemplate.startsWith("//") ||
    request.pathTemplate.includes("\\") ||
    request.pathTemplate.includes("#") ||
    !isObject(request.parameters) ||
    !["inherit", "none"].includes(request.auth) ||
    !PERMISSIONS.includes(request.minimumBoardPermission)
  )
    bad("Widget contains an invalid request");
  if (
    Object.keys(request.parameters).length > 32 ||
    Object.entries(request.parameters).some(([name, type]) => !validBindingId(name) || !PARAMETER_TYPES.includes(type))
  )
    bad("Widget request parameters are invalid");
  const trigger = request.trigger || "manual";
  if (!["load", "manual"].includes(trigger) || (request.kind === "action" && trigger === "load"))
    bad("Actions cannot run automatically");
  if (request.kind === "query" && request.confirmation !== undefined) bad("Only actions can require confirmation");
  if (request.kind === "query" && request.invalidates !== undefined) bad("Only actions can invalidate queries");
  if (request.method === "DELETE" && request.minimumBoardPermission !== "full")
    bad("DELETE requests require full permission");
  if (
    request.queryTemplate !== undefined &&
    (!isObject(request.queryTemplate) || Object.keys(request.queryTemplate).some((key) => !key || key.length > 256))
  )
    bad("Widget query template is invalid");
  if (
    request.confirmation !== undefined &&
    (!isObject(request.confirmation) ||
      Object.keys(request.confirmation).some(
        (key) => !["title", "message", "confirmLabel", "destructive"].includes(key),
      ) ||
      typeof request.confirmation.title !== "string" ||
      !request.confirmation.title ||
      request.confirmation.title.length > 128 ||
      typeof request.confirmation.message !== "string" ||
      !request.confirmation.message ||
      request.confirmation.message.length > 512 ||
      (request.confirmation.confirmLabel !== undefined &&
        (typeof request.confirmation.confirmLabel !== "string" ||
          !request.confirmation.confirmLabel ||
          request.confirmation.confirmLabel.length > 64)) ||
      (request.confirmation.destructive !== undefined && typeof request.confirmation.destructive !== "boolean"))
  )
    bad("Widget action confirmation is invalid");
  if (
    request.invalidates !== undefined &&
    (!Array.isArray(request.invalidates) ||
      request.invalidates.length > 32 ||
      request.invalidates.some((id) => !validId(id)))
  )
    bad("Widget invalidation targets are invalid");
  if (
    request.cacheTtlSeconds !== undefined &&
    (!Number.isInteger(request.cacheTtlSeconds) ||
      request.cacheTtlSeconds < 0 ||
      request.cacheTtlSeconds > 3600 ||
      (request.kind === "action" && request.cacheTtlSeconds !== 0))
  )
    bad("Widget request cache duration is invalid");
  if (request.staticHeaders !== undefined) {
    if (!isObject(request.staticHeaders) || Object.keys(request.staticHeaders).length > 32)
      bad("Widget static headers are invalid");
    for (const [name, value] of Object.entries(request.staticHeaders)) {
      if (!validHeaderName(name) || typeof value !== "string" || value.length > 8192)
        bad("Widget static headers are invalid");
      if ((SENSITIVE_KEY.test(name) && value.trim()) || /^\s*bearer\s+\S{8,}\s*$/i.test(value))
        bad("Widget static headers must not contain credentials");
    }
  }
  const used = new Set();
  const placeholderPattern = /\{([^{}]+)\}/g;
  let placeholder;
  while ((placeholder = placeholderPattern.exec(request.pathTemplate)) !== null) used.add(placeholder[1]);
  collectParams(request.queryTemplate, used);
  collectParams(request.bodyTemplate, used);
  for (const name of used)
    if (!Object.prototype.hasOwnProperty.call(request.parameters, name))
      bad("Widget request uses an undeclared parameter");
}

function collectParams(value, result) {
  if (Array.isArray(value)) {
    for (const item of value) collectParams(item, result);
    return;
  }
  if (!isObject(value)) return;
  const entries = Object.entries(value);
  if (entries.length === 1 && entries[0][0] === "$param" && typeof entries[0][1] === "string") {
    result.add(entries[0][1]);
    return;
  }
  for (const entry of entries) collectParams(entry[1], result);
}

function validateOptionsMetadata(metadata, schema) {
  if (
    !isObject(metadata) ||
    Object.keys(metadata).some((key) => !["control", "placeholder", "advanced", "order", "optionsSource"].includes(key))
  )
    bad("Widget option presentation metadata is invalid");
  if (metadata.control !== undefined && !OPTION_CONTROLS.includes(metadata.control))
    bad("Widget option control is invalid");
  const controlsByType = {
    string: ["text", "textarea", "select", "date", "time", "color", "icon", "url", "timeZone", "json"],
    number: ["number", "select", "slider", "duration", "json"],
    integer: ["number", "select", "slider", "duration", "json"],
    boolean: ["switch", "select", "json"],
    array: ["multi-select", "json"],
    object: ["json"],
    null: ["json"],
  };
  if (
    metadata.control !== undefined &&
    schema.type !== undefined &&
    !controlsByType[schema.type].includes(metadata.control)
  )
    bad("Widget option control does not match its type");
  if (metadata.placeholder !== undefined && typeof metadata.placeholder !== "string")
    bad("Widget option placeholder is invalid");
  if (metadata.advanced !== undefined && typeof metadata.advanced !== "boolean")
    bad("Widget advanced option metadata is invalid");
  if (metadata.order !== undefined && (typeof metadata.order !== "number" || !Number.isFinite(metadata.order)))
    bad("Widget option order is invalid");
  if (metadata.optionsSource !== undefined) {
    const source = metadata.optionsSource;
    if (
      !isObject(source) ||
      Object.keys(source).some((key) => !["requestId", "itemsPath", "valuePath", "labelPath"].includes(key)) ||
      !["requestId", "valuePath", "labelPath"].every((key) => typeof source[key] === "string" && source[key]) ||
      (source.itemsPath !== undefined && (typeof source.itemsPath !== "string" || !source.itemsPath))
    )
      bad("Widget dynamic option source is invalid");
    if (!["select", "multi-select"].includes(metadata.control)) bad("Widget dynamic options require a select control");
  }
}

function validateOptionsSchema(schema, root, requireType) {
  if (!isObject(schema) || Object.keys(schema).some((key) => !OPTION_FIELDS.includes(key)))
    bad("Widget options schema is invalid");
  if (requireType !== false && !OPTION_TYPES.includes(schema.type)) bad("Every widget option needs one supported type");
  if (schema.type !== undefined && !OPTION_TYPES.includes(schema.type)) bad("Widget option type is invalid");
  if (root && schema.type !== "object") bad("Widget options schema root must be an object");
  if (schema.type === "object" && schema.additionalProperties !== false)
    bad("Widget object options must reject unknown fields");
  for (const key of ["title", "description"])
    if (schema[key] !== undefined && typeof schema[key] !== "string") bad("Widget option labels are invalid");
  for (const key of ["minimum", "maximum", "multipleOf"])
    if (schema[key] !== undefined && (typeof schema[key] !== "number" || !Number.isFinite(schema[key])))
      bad("Widget numeric option constraints are invalid");
  if (schema.multipleOf !== undefined && schema.multipleOf <= 0) bad("Widget multipleOf must be positive");
  if (schema.minimum !== undefined && schema.maximum !== undefined && schema.minimum > schema.maximum)
    bad("Widget option bounds are invalid");
  for (const key of ["minLength", "maxLength", "minItems", "maxItems"])
    if (schema[key] !== undefined && (!Number.isInteger(schema[key]) || schema[key] < 0))
      bad("Widget option size constraints are invalid");
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || schema.enum.length < 1 || schema.enum.length > 100))
    bad("Widget option enum is invalid");
  if (schema.format !== undefined && (!OPTION_FORMATS.includes(schema.format) || schema.type !== "string"))
    bad("Widget option format is invalid");
  if (Array.isArray(schema.enum) && schema.enum.some((entry) => !optionMatches({ type: schema.type }, entry)))
    bad("Widget option enum values do not match their type");
  if (schema.const !== undefined && !optionMatches({ type: schema.type }, schema.const))
    bad("Widget option constant does not match its type");
  if (schema.properties !== undefined) {
    if (!isObject(schema.properties)) bad("Widget option properties are invalid");
    for (const [name, child] of Object.entries(schema.properties)) {
      if (!validBindingId(name))
        bad("Widget option names must start with a letter and contain letters, numbers, - or _");
      if (SENSITIVE_KEY.test(name)) bad("Credentials must use source authentication, not widget options");
      validateOptionsSchema(child, false, true);
    }
    if (schema.type !== undefined && schema.type !== "object") bad("Widget option properties require an object type");
    if (
      schema.required !== undefined &&
      (!Array.isArray(schema.required) ||
        schema.required.some(
          (key) => typeof key !== "string" || !Object.prototype.hasOwnProperty.call(schema.properties, key),
        ))
    )
      bad("Widget required options are invalid");
  }
  if (schema.required !== undefined && !Array.isArray(schema.required)) bad("Widget required options are invalid");
  if (schema.type === "array" && schema.items === undefined) bad("Widget array options require items");
  if (schema.items !== undefined) {
    if (schema.type !== undefined && schema.type !== "array") bad("Widget option items require an array type");
    validateOptionsSchema(schema.items, false, true);
  }
  for (const branch of ["if", "then", "else"])
    if (schema[branch] !== undefined) validateOptionsSchema(schema[branch], false, branch !== "if");
  if (schema["x-homarr"] !== undefined) validateOptionsMetadata(schema["x-homarr"], schema);
}

function optionMatches(schema, value) {
  if (schema.const !== undefined && value !== schema.const) return false;
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return false;
  if (schema.type === "object" && !isObject(value)) return false;
  if (schema.type === "array" && !Array.isArray(value)) return false;
  if (schema.type === "integer" && (typeof value !== "number" || !Number.isInteger(value))) return false;
  if (schema.type === "number" && typeof value !== "number") return false;
  if (schema.type === "string" && typeof value !== "string") return false;
  if (schema.type === "boolean" && typeof value !== "boolean") return false;
  if (schema.type === "null" && value !== null) return false;
  if (isObject(schema.properties) && isObject(value)) {
    for (const [key, child] of Object.entries(schema.properties)) {
      if (value[key] !== undefined && isObject(child) && !optionMatches(child, value[key])) return false;
    }
  }
  return true;
}

function validateOptionsValue(schema, value) {
  if (!optionMatches(schema, value)) bad("Widget default options do not match their schema");
  if (schema.type === "object") {
    if (!isObject(value)) bad("Widget default options do not match their schema");
    const branch =
      isObject(schema.if) && optionMatches(schema.if, value)
        ? schema.then
        : isObject(schema.if)
          ? schema.else
          : undefined;
    const properties = Object.assign(
      {},
      isObject(schema.properties) ? schema.properties : {},
      isObject(branch) && isObject(branch.properties) ? branch.properties : {},
    );
    const required = (Array.isArray(schema.required) ? schema.required : []).concat(
      isObject(branch) && Array.isArray(branch.required) ? branch.required : [],
    );
    for (const key of required) if (value[key] === undefined) bad("Widget default options omit a required value");
    for (const [key, child] of Object.entries(value)) {
      if (!isObject(properties[key])) bad("Widget default options contain an unknown value");
      validateOptionsValue(properties[key], child);
    }
    return;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) bad("Widget default options do not match their schema");
    if (isObject(schema.items)) for (const item of value) validateOptionsValue(schema.items, item);
    return;
  }
  if (schema.type === "integer" && (typeof value !== "number" || !Number.isInteger(value)))
    bad("Widget default options do not match their schema");
  if (schema.type === "number" && typeof value !== "number") bad("Widget default options do not match their schema");
  if (schema.type === "string" && typeof value !== "string") bad("Widget default options do not match their schema");
  if (schema.type === "boolean" && typeof value !== "boolean") bad("Widget default options do not match their schema");
  if (schema.type === "null" && value !== null) bad("Widget default options do not match their schema");
}

function collectDynamicOptionRequestIds(schema, result) {
  if (!isObject(schema)) return;
  const metadata = schema["x-homarr"];
  if (isObject(metadata) && isObject(metadata.optionsSource)) result.add(metadata.optionsSource.requestId);
  if (isObject(schema.properties))
    for (const child of Object.values(schema.properties)) collectDynamicOptionRequestIds(child, result);
  if (schema.items !== undefined) collectDynamicOptionRequestIds(schema.items, result);
  for (const branch of ["if", "then", "else"])
    if (schema[branch] !== undefined) collectDynamicOptionRequestIds(schema[branch], result);
}

function containsCredential(value, key) {
  if (SENSITIVE_KEY.test(key || "") && typeof value === "string" && value.trim()) return true;
  if (Array.isArray(value)) return value.some((entry) => containsCredential(entry, ""));
  if (!isObject(value)) return false;
  if (Object.keys(value).length === 1 && typeof value.$param === "string") return false;
  return Object.entries(value).some(([childKey, child]) => containsCredential(child, childKey));
}

function containsPrototypeKey(value) {
  if (Array.isArray(value)) return value.some(containsPrototypeKey);
  if (!isObject(value)) return false;
  return Object.entries(value).some(
    ([key, child]) =>
      ["__proto__", "prototype", "constructor"].includes(key.toLowerCase()) || containsPrototypeKey(child),
  );
}

function validateTemplate(template) {
  if (typeof template !== "string" || !template.trim() || template.length > 50000) bad("Widget template is invalid");
  if (
    /(?:<\s*(?:script|style|iframe|object|embed|form)\b|dangerouslySetInnerHTML\s*=|\bon[A-Z][A-Za-z]*\s*=|\b(?:component|renderRoot|withinPortal|ref)\s*=|\b(?:fetch|eval|XMLHttpRequest)\s*\(|\bimport\s|\{[^{}]*\bstate(?:\.|\[))/i.test(
      template,
    )
  )
    bad("Widget template requests a blocked capability");
}

function validateTemplateRequests(template, requests) {
  const byId = new Map(requests.map((request) => [request.id, request]));
  const componentPattern = /<(SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/g;
  let match;
  while ((match = componentPattern.exec(template)) !== null) {
    const idMatch = match[2].match(/\brequestId\s*=\s*(?:"([^"]+)"|'([^']+)')/);
    const requestId = idMatch && (idMatch[1] || idMatch[2]);
    if (!requestId) bad(`${match[1]} must use a literal requestId`);
    const request = byId.get(requestId);
    const expectedKind = match[1] === "SubFetch" ? "query" : "action";
    if (!request || request.kind !== expectedKind) bad(`${match[1]} references an invalid request`);
  }
}

function validateTemplateBindings(template) {
  const bindingPattern = /<[A-Z][A-Za-z0-9.]*(?:\s[^<>]*?)?\bbind\s*=\s*(?:"([^"]+)"|'([^']+)'|\{)/g;
  let match;
  while ((match = bindingPattern.exec(template)) !== null) {
    const inputName = match[1] || match[2];
    if (!inputName) bad("bind must use a literal input name");
    if (!validBindingId(inputName)) bad("bind must use a valid input name");
  }
}

function validateSubmission(record) {
  const content = record.getString("content");
  let widget;
  try {
    widget = JSON.parse(content);
  } catch {
    bad("Widget content is not valid JSON");
  }
  if (
    !isObject(widget) ||
    widget.$schema !== WIDGET_SCHEMA ||
    typeof widget.name !== "string" ||
    !widget.name.trim() ||
    widget.name.length > 128 ||
    (widget.description !== undefined && (typeof widget.description !== "string" || widget.description.length > 512)) ||
    (widget.iconUrl !== undefined && (!validHttpUrl(widget.iconUrl) || /^https?:\/\/[^/]*@/i.test(widget.iconUrl))) ||
    Object.keys(widget).some((key) => !TOP_LEVEL_FIELDS.includes(key)) ||
    !Array.isArray(widget.sources) ||
    widget.sources.length < 1 ||
    widget.sources.length > 8 ||
    !Array.isArray(widget.requests) ||
    widget.requests.length > 64 ||
    !isObject(widget.defaultOptions)
  )
    bad("Widget does not match homarr-custom-widget-v2");
  validateOptionsSchema(widget.optionsSchema, true, true);
  validateOptionsValue(widget.optionsSchema, widget.defaultOptions);
  if (
    widget.iconUrl &&
    /[?&](?:authorization|api[-_]?keys?|passwords?|passwds?|secrets?|tokens?|access[-_]?tokens?|refresh[-_]?tokens?|client[-_]?secrets?)=/i.test(
      widget.iconUrl,
    )
  )
    bad("Widget icon URLs must not contain credentials");
  const sourceIds = new Set();
  for (const source of widget.sources) {
    validateSource(source);
    if (sourceIds.has(source.id)) bad("Widget source IDs must be unique");
    sourceIds.add(source.id);
  }
  const requestIds = new Set();
  for (const request of widget.requests) {
    validateRequest(request, sourceIds);
    if (requestIds.has(request.id)) bad("Widget request IDs must be unique");
    requestIds.add(request.id);
  }
  for (const request of widget.requests)
    for (const target of request.invalidates || []) {
      const targetRequest = widget.requests.find((candidate) => candidate.id === target);
      if (!targetRequest || targetRequest.kind !== "query") bad("Widget invalidates an unknown or non-query request");
    }
  for (const request of widget.requests) {
    if (request.auth !== "inherit") continue;
    const source = widget.sources.find((candidate) => candidate.id === request.sourceId);
    if (
      source.auth.type === "apiKeyHeader" &&
      Object.keys(request.staticHeaders || {}).some(
        (name) => name.toLowerCase() === source.auth.headerName.toLowerCase(),
      )
    )
      bad("Widget request overrides source authentication");
    if (
      source.auth.type === "apiKeyQuery" &&
      Object.keys(request.queryTemplate || {}).some(
        (name) => name.toLowerCase() === source.auth.parameterName.toLowerCase(),
      )
    )
      bad("Widget request overrides source authentication");
  }
  const dynamicOptionRequestIds = new Set();
  collectDynamicOptionRequestIds(widget.optionsSchema, dynamicOptionRequestIds);
  for (const requestId of dynamicOptionRequestIds) {
    const request = widget.requests.find((candidate) => candidate.id === requestId);
    if (!request || request.kind !== "query") bad("Widget dynamic options must reference a query request");
  }
  validateTemplate(widget.template);
  validateTemplateRequests(widget.template, widget.requests);
  validateTemplateBindings(widget.template);
  for (const request of widget.requests) {
    for (const [name, value] of Object.entries(request.staticHeaders || {})) {
      if ((SENSITIVE_KEY.test(name) && String(value).trim()) || /^\s*bearer\s+\S{8,}\s*$/i.test(String(value)))
        bad("Widget static headers must not contain credentials");
    }
  }
  if (
    CREDENTIAL_TEXT.test(widget.template) ||
    containsCredential(widget.defaultOptions, "") ||
    widget.requests.some(
      (request) => containsCredential(request.bodyTemplate, "") || containsCredential(request.queryTemplate, ""),
    )
  )
    bad("Widget exports must not contain credentials");
  if (
    containsPrototypeKey(widget.optionsSchema) ||
    containsPrototypeKey(widget.defaultOptions) ||
    widget.requests.some(
      (request) => containsPrototypeKey(request.queryTemplate) || containsPrototypeKey(request.bodyTemplate),
    )
  )
    bad("Widget contains a prototype-pollution key");
  record.set("contentHash", $security.sha256(content));
}

function isAdmin(app, userId) {
  try {
    app.findFirstRecordByFilter("workshop_admins", "user = {:user}", { user: userId });
    return true;
  } catch {
    return false;
  }
}

function snapshot(record) {
  const data = record.publicExport();
  if (typeof data.content === "string") {
    data.contentHash = $security.sha256(data.content);
    delete data.content;
  }
  return JSON.stringify(data);
}

function audit(app, actor, action, values) {
  const record = new Record(app.findCollectionByNameOrId("workshop_admin_actions"));
  record.set("actor", actor.id);
  record.set("action", action);
  Object.entries(values).forEach(([key, value]) => record.set(key, value));
  app.save(record);
}

module.exports = { audit, isAdmin, snapshot, validateSubmission };
