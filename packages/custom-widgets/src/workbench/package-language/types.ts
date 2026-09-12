export interface PackageLanguageLibraries {
  files: Record<string, string>;
  roots: Record<string, string>;
  globalFiles: string[];
  defaultLib: string;
  sdkVersion: string;
  typescriptVersion: string;
}

export interface PackageLanguageLocation {
  path: string;
  from: number;
  to: number;
  /** Declaration excerpts are read-only and never become package files. */
  declaration?: { source: string; line: number };
}

export interface PackageLanguageDiagnostic extends PackageLanguageLocation {
  message: string;
  severity: "error" | "warning" | "info";
  code: number;
}

export interface PackageLanguageCompletion {
  name: string;
  kind: string;
  sortText: string;
  insertText?: string;
  from?: number;
  to?: number;
}

export interface PackageLanguageInfo {
  from: number;
  to: number;
  signature: string;
  documentation: string;
}

export interface PackageLanguageMethods {
  diagnostics: { input: { path: string }; output: PackageLanguageDiagnostic[] };
  complete: {
    input: { path: string; position: number; prefix: string };
    output: PackageLanguageCompletion[];
  };
  detail: { input: { path: string; position: number; name: string }; output: PackageLanguageInfo | null };
  hover: { input: { path: string; position: number }; output: PackageLanguageInfo | null };
  definition: { input: { path: string; position: number }; output: PackageLanguageLocation | null };
  format: { input: { path: string }; output: string };
  rename: {
    input: { path: string; position: number; name: string };
    output: Record<string, string>;
  };
}

export type PackageLanguageMethod = keyof PackageLanguageMethods;
export type PackageLanguageRequest = {
  [K in PackageLanguageMethod]: {
    id: number;
    revision: number;
    method: K;
    input: PackageLanguageMethods[K]["input"];
  };
}[PackageLanguageMethod];
export type PackageLanguageMessage =
  | PackageLanguageRequest
  | { method: "update"; revision: number; changes: Record<string, string | null> };
export type PackageLanguageResponse =
  | { id: number; value: unknown; revision: number }
  | { id: number; error: string; revision: number };

export interface PackageLanguageCallbacks {
  navigate(location: PackageLanguageLocation): void;
  diagnostics(diagnostics: PackageLanguageDiagnostic[]): void;
  error(message: string): void;
  rename?(position: number, currentName: string): void;
}
