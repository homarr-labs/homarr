export interface CustomWidgetOptionIssue {
  path: string;
  message: string;
}

type JsonSchema = Record<string, unknown>;

export function validateCustomWidgetOptions(
  schema: JsonSchema,
  value: Record<string, unknown>,
): CustomWidgetOptionIssue[] {
  const issues: CustomWidgetOptionIssue[] = [];
  validateValue(schema, value, "configuration", issues);
  return issues;
}

function validateValue(schema: JsonSchema, value: unknown, path: string, issues: CustomWidgetOptionIssue[]): void {
  if (schema.const !== undefined && !Object.is(value, schema.const)) {
    issues.push({ path, message: "Value does not match the required constant" });
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => Object.is(candidate, value))) {
    issues.push({ path, message: "Value is not one of the allowed choices" });
    return;
  }

  const type = schema.type;
  if (typeof type === "string" && !matchesType(type, value)) {
    issues.push({ path, message: `Expected ${type}` });
    return;
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength)
      issues.push({ path, message: `Must contain at least ${schema.minLength} characters` });
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength)
      issues.push({ path, message: `Must contain at most ${schema.maxLength} characters` });
    if (schema.format === "uri" && !URL.canParse(value)) issues.push({ path, message: "Must be a valid URL" });
  }

  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum)
      issues.push({ path, message: `Must be at least ${schema.minimum}` });
    if (typeof schema.maximum === "number" && value > schema.maximum)
      issues.push({ path, message: `Must be at most ${schema.maximum}` });
    if (typeof schema.multipleOf === "number" && schema.multipleOf > 0 && value % schema.multipleOf !== 0)
      issues.push({ path, message: `Must be a multiple of ${schema.multipleOf}` });
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems)
      issues.push({ path, message: `Choose at least ${schema.minItems} values` });
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
      issues.push({ path, message: `Choose at most ${schema.maxItems} values` });
    const items = schema.items;
    if (isRecord(items)) value.forEach((entry, index) => validateValue(items, entry, `${path}.${index}`, issues));
  }

  if (isRecord(value)) {
    const branch =
      isRecord(schema.if) && matchesSchema(schema.if, value)
        ? schema.then
        : isRecord(schema.if)
          ? schema.else
          : undefined;
    const branchSchema = isRecord(branch) ? branch : {};
    const properties = {
      ...(isRecord(schema.properties) ? schema.properties : {}),
      ...(isRecord(branchSchema.properties) ? branchSchema.properties : {}),
    };
    const required = [
      ...(Array.isArray(schema.required) ? schema.required : []),
      ...(Array.isArray(branchSchema.required) ? branchSchema.required : []),
    ].filter((entry): entry is string => typeof entry === "string");
    for (const key of required) {
      if (value[key] === undefined) issues.push({ path: `${path}.${key}`, message: "This field is required" });
    }
    for (const [key, child] of Object.entries(value)) {
      const childSchema = properties[key];
      if (isRecord(childSchema)) validateValue(childSchema, child, `${path}.${key}`, issues);
      else if (schema.additionalProperties === false)
        issues.push({ path: `${path}.${key}`, message: "Unknown option" });
    }
  }

  if (isRecord(schema.if) && !isRecord(value)) {
    const branch = matchesSchema(schema.if, value) ? schema.then : schema.else;
    if (isRecord(branch)) validateValue(branch, value, path, issues);
  }
}

function matchesSchema(schema: JsonSchema, value: unknown): boolean {
  const issues: CustomWidgetOptionIssue[] = [];
  validateValue(schema, value, "value", issues);
  return issues.length === 0;
}

function matchesType(type: string, value: unknown): boolean {
  if (type === "object") return isRecord(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
