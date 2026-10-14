import { sanitize } from "isomorphic-dompurify";

import type { SanitizeSvg } from "./response";

export const sanitizeMediaSvg: SanitizeSvg = sanitize;
