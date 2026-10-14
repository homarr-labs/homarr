import { createFileRoute } from "@tanstack/react-router";

import { HeaderDraftPreview } from "../../../../app/preview-header";

export const Route = createFileRoute("/(public)/_public/preview/header")({ component: HeaderDraftPreview });
