import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { britishSpellings, imperativeVerbs, nonSteTerms, technicalTerms } from "./custom-widgets-ste-terms.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const docsDirectory = resolve(scriptDirectory, "../docs");

const files = [
  { path: "management/custom-widgets/agent-authoring.mdx" },
  { path: "management/custom-widgets/authoring.mdx" },
  { path: "management/custom-widgets/custom-jsx.mdx" },
  { path: "management/custom-widgets/index.mdx" },
  { path: "management/custom-widgets/requests-and-security.mdx" },
  { path: "management/custom-widgets/troubleshooting.mdx" },
  { path: "management/workshop/index.mdx" },
  { path: "widgets/custom-api/index.mdx" },
  { path: "management/api/index.mdx", section: "Get Custom Widget authoring resources" },
  { path: "management/mcp.mdx", section: "Create a Custom Widget with an AI agent", includeMatching: /Custom Widget/ },
  { path: "advanced/environment-variables/index.mdx", includeMatching: /WORKSHOP_API_URL/ },
  { path: "community/faq.mdx", section: "Can I add my own widgets? Do I need programming skills?" },
  { path: "management/backup.mdx", includeMatching: /Custom Widget/ },
];

const imperativeSet = new Set(imperativeVerbs);
const issues = [];

const overview = await readFile(resolve(docsDirectory, "management/custom-widgets/index.mdx"), "utf8");
if (!overview.includes("## Audience and prerequisites")) {
  addIssue("management/custom-widgets/index.mdx", 1, "Add the required audience and prerequisites section.");
}

for (const file of files) {
  const absolutePath = resolve(docsDirectory, file.path);
  const source = await readFile(absolutePath, "utf8");
  const selectedLines = selectLines(source, file);
  const paragraphs = getProseParagraphs(selectedLines);

  for (const paragraph of paragraphs) {
    const sentences = splitSentences(paragraph.text);
    if (sentences.length > 6) {
      addIssue(file.path, paragraph.line, `Paragraph has ${sentences.length} sentences. The limit is 6.`);
    }

    for (const sentence of sentences) {
      const wordCount = countWords(sentence);
      const isProcedure = paragraph.isList || startsWithImperative(sentence);
      const limit = isProcedure ? 20 : 25;
      if (wordCount > limit) {
        const type = isProcedure ? "Procedural" : "Descriptive";
        addIssue(file.path, paragraph.line, `${type} sentence has ${wordCount} words. The limit is ${limit}.`);
      }
    }

    checkTerms(file.path, paragraph.line, paragraph.text);
  }
}

if (issues.length > 0) {
  console.error("Custom Widget STE check failed:\n");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Custom Widget STE check passed. ${technicalTerms.length} technical terms are registered.`);
}

function selectLines(source, file) {
  const lines = source.split("\n").map((text, index) => ({ text, line: index + 1 }));
  if (!file.section && !file.includeMatching) return lines;

  const selected = [];
  if (file.section) {
    const start = lines.findIndex(({ text }) => text.trim().replace(/^#{2,6}\s+/, "") === file.section);
    if (start === -1) throw new Error(`Section '${file.section}' was not found in ${file.path}`);
    const headingLevel = lines[start].text.trim().match(/^#+/)?.[0].length ?? 2;

    for (let index = start; index < lines.length; index += 1) {
      const nextHeadingLevel = lines[index].text.trim().match(/^#+(?=\s)/)?.[0].length;
      if (index > start && nextHeadingLevel && nextHeadingLevel <= headingLevel) break;
      selected.push(lines[index]);
    }
  }

  if (file.includeMatching) {
    for (const line of lines) {
      if (file.includeMatching.test(line.text) && !selected.some((item) => item.line === line.line))
        selected.push(line);
    }
  }

  return selected.toSorted((left, right) => left.line - right.line);
}

function getProseParagraphs(lines) {
  const paragraphs = [];
  let paragraph = null;
  let inFence = false;
  let inFrontmatter = false;
  let inTemplateExport = false;
  let inJsxTag = false;

  const flush = () => {
    if (paragraph?.text.trim()) paragraphs.push({ ...paragraph, text: paragraph.text.trim() });
    paragraph = null;
  };

  for (const { text: originalText, line } of lines) {
    const trimmed = originalText.trim();

    if (line === 1 && trimmed === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter && trimmed === "---") {
      inFrontmatter = false;
      continue;
    }
    if (trimmed.startsWith("```")) {
      flush();
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (/^export const .*?=\s*`/.test(trimmed)) inTemplateExport = true;
    if (inTemplateExport) {
      if (/`;\s*$/.test(trimmed)) inTemplateExport = false;
      continue;
    }

    if (/^(import|export)\s/.test(trimmed)) continue;
    if (trimmed.startsWith("<")) inJsxTag = true;
    if (inJsxTag) {
      if (trimmed.includes(">")) inJsxTag = false;
      continue;
    }

    let text = trimmed;
    if (inFrontmatter) {
      const match = text.match(/^(title|description|sidebar_label):\s*["']?(.*?)["']?$/);
      if (!match) continue;
      text = match[2];
    }

    if (!text || /^\|?\s*:?-+:?/.test(text)) {
      flush();
      continue;
    }

    const isList = /^\s*(?:[-*]|\d+\.)\s+/.test(text);
    text = cleanMarkdown(text);
    if (!text) {
      flush();
      continue;
    }

    if (isList || text.startsWith("#") || text.startsWith("|")) flush();
    text = text
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
      .replace(/^\|\s*/, "")
      .replace(/\s*\|\s*$/, "");

    if (!paragraph) paragraph = { text, line, isList };
    else paragraph.text += ` ${text}`;

    if (isList || trimmed.startsWith("#") || trimmed.startsWith("|")) flush();
  }

  flush();
  return paragraphs;
}

function cleanMarkdown(text) {
  return text
    .replace(/\[([^\]]+)]\([^\s)]+(?:\s+"[^"]*")?\)/g, "$1")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_~]/g, "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text) {
  const normalized = text.replace(/\b(?:for example|such as)\b/gi, "example");
  const matches = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

function countWords(sentence) {
  return sentence.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
}

function startsWithImperative(sentence) {
  const firstWord = sentence.toLowerCase().match(/[a-z]+/)?.[0];
  return firstWord ? imperativeSet.has(firstWord) : false;
}

function checkTerms(path, line, text) {
  const lowerText = text.toLowerCase();
  for (const spelling of britishSpellings) {
    if (new RegExp(`\\b${spelling}\\b`, "i").test(text)) {
      addIssue(path, line, `Use American English instead of '${spelling}'.`);
    }
  }
  for (const term of nonSteTerms) {
    if (new RegExp(`\\b${term}\\b`, "i").test(lowerText)) {
      addIssue(path, line, `Replace the non-STE term '${term}'.`);
    }
  }
}

function addIssue(path, line, message) {
  issues.push(`${path}:${line} ${message}`);
}
