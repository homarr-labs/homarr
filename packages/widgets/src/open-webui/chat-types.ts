export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

export type CompletionPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type CompletionMessage = { role: ChatMessage["role"]; content: string | CompletionPart[] };

export interface ImageAttachment {
  name: string;
  dataUrl: string;
}
export interface WebAttachment {
  url: string;
  collectionName: string;
  title: string;
}
export interface FileAttachment {
  id: string;
  name: string;
}
export interface NoteAttachment {
  id: string;
  title: string;
  content: string;
}
export interface ChatAttachment {
  id: string;
  title: string;
  transcript: string;
}

// Which sub-view the attach popover is showing.
export type AttachView = "root" | "webpage" | "files" | "notes" | "knowledge" | "chats";

// Retrieval collections + verbatim context blocks injected before a completion.
export interface Grounding {
  collections: string[];
  contextTexts: string[];
}
