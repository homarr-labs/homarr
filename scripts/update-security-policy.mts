import { readFile, writeFile } from "fs/promises";

const fileName = "SECURITY.md";
const env = {
  NEXT_VERSION: process.env.NEXT_VERSION as string,
};

const content = await readFile(fileName, "utf8");
const updatedContent = content
  .replace(/<td>&gt;\d+\.\d+\.\d+<\/td>/g, `<td>&gt;${env.NEXT_VERSION.replace("v", "")}</td>`)
  .replace(/<td>&lt;\d+\.\d+\.\d+<\/td>/g, `<td>&lt;${env.NEXT_VERSION.replace("v", "")}</td>`);

await writeFile(fileName, updatedContent, "utf8");
