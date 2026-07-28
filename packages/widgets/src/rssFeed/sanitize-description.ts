import { sanitize } from "isomorphic-dompurify";

const allowedDescriptionTags = ["b", "br", "em", "i", "li", "ol", "p", "s", "strong", "u", "ul"];

export const sanitizeFeedDescription = (description: string) =>
  sanitize(description, {
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    ALLOWED_ATTR: [],
    ALLOWED_TAGS: allowedDescriptionTags,
  });
