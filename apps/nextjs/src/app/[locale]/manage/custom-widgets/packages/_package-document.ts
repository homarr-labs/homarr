import { createId, isRecord } from "@homarr/common";
import { redactCustomWidgetCredentialLiterals } from "@homarr/custom-widgets/core";

export interface PackageDocument {
  name: string;
  metadata: string;
  files: Record<string, string>;
}

export function documentFromSource(name: string, source: unknown): PackageDocument {
  if (!isRecord(source)) return { name, metadata: "{}", files: {} };
  const { files, _draftMetadata, ...metadata } = source;
  const document = { name, metadata: JSON.stringify(metadata, null, 2), files: {} as Record<string, string> };
  if (typeof _draftMetadata === "string") document.metadata = _draftMetadata;
  if (isRecord(files)) {
    for (const [path, content] of Object.entries(files))
      if (typeof content === "string") document.files[path] = content;
  }
  return document;
}

export function documentFromTemplate(name: string, source: unknown): PackageDocument {
  if (!isRecord(source) || !isRecord(source.manifest)) return documentFromSource(name, source);
  return documentFromSource(name, {
    ...source,
    manifest: { ...source.manifest, id: `local.${createId()}`, name, version: "1.0.0" },
  });
}

export function documentSource(document: PackageDocument): Record<string, unknown> {
  try {
    const metadata: unknown = JSON.parse(document.metadata);
    if (isRecord(metadata)) return { ...metadata, files: document.files };
  } catch {
    /* An incomplete manifest can still be saved as a draft. */
  }
  return { _draftMetadata: document.metadata, files: document.files };
}

const redact = (text: string) =>
  redactCustomWidgetCredentialLiterals(text).replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gu, "$1");

export function recoveryDocument(document: PackageDocument): PackageDocument {
  return {
    name: redact(document.name),
    metadata: redact(document.metadata),
    files: Object.fromEntries(Object.entries(document.files).map(([path, content]) => [path, redact(content)])),
  };
}

export function downloadPackage(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name.replace(/[^a-z0-9._-]+/giu, "-") || "widget"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type PackageOperation = () => Promise<unknown>;
