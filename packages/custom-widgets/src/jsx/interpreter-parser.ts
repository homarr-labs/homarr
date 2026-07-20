import { Parser } from "acorn";
import jsx from "acorn-jsx";

import type { AstNode } from "./interpreter-foundation";
import { asNode, asNodeArray, SafeJsxError } from "./interpreter-foundation";
import { CUSTOM_JSX_LIMITS } from "./policy";

const JsxParser = Parser.extend(jsx());

export function parseCustomJsxTemplate(template: string): AstNode {
  if (template.length > CUSTOM_JSX_LIMITS.templateLength) {
    throw new SafeJsxError(`Template exceeds the ${CUSTOM_JSX_LIMITS.templateLength} character limit`);
  }
  let program: AstNode;
  try {
    program = JsxParser.parse(`<>${template}</>`, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowAwaitOutsideFunction: false,
      allowReturnOutsideFunction: false,
    }) as unknown as AstNode;
  } catch (error) {
    throw new SafeJsxError(error instanceof Error ? error.message : "Unable to parse JSX template");
  }
  const body = asNodeArray(program.body, "program body");
  if (body.length !== 1 || body[0]?.type !== "ExpressionStatement") {
    throw new SafeJsxError("Template must contain JSX only");
  }
  return asNode(body[0].expression, "template expression");
}

export function normalizeCustomJsxText(value: string): string {
  const lines = value.replace(/\r/g, "").split("\n");
  let result = "";
  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index] ?? "";
    line = line.replace(/\t/g, " ");
    if (index !== 0) line = line.replace(/^\s+/, "");
    if (index !== lines.length - 1) line = line.replace(/\s+$/, "");
    if (!line) continue;
    if (result) result += " ";
    result += line;
  }
  return result;
}
