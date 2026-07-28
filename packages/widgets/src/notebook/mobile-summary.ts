export const extractNotebookExcerpt = (content: string) => {
  const parsedDocument = new DOMParser().parseFromString(content, "text/html");
  parsedDocument.querySelectorAll("script, style").forEach((element) => {
    element.remove();
  });

  const textWalker = parsedDocument.createTreeWalker(parsedDocument.body, NodeFilter.SHOW_TEXT);
  const textParts: string[] = [];

  while (textWalker.nextNode()) {
    textParts.push(textWalker.currentNode.textContent ?? "");
  }

  return textParts.join(" ").replace(/\s+/g, " ").trim();
};
