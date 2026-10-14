import { createFileRoute } from "@tanstack/react-router";

import { PlayablePreview } from "../../../app/preview";

export const Route = createFileRoute("/(public)/_public/")({ component: PlayablePreview });
