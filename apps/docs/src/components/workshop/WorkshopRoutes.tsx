"use client";

import { getRuntimeWorkshopApiUrl } from "@/lib/runtime-config";

import { WorkshopAdmin } from "./WorkshopAdmin";
import { WorkshopApp } from "./WorkshopApp";

interface WorkshopRouteProps {
  configuredWorkshopUrl: string;
}

export function WorkshopRoute({ configuredWorkshopUrl }: WorkshopRouteProps) {
  return <WorkshopApp workshopUrl={getRuntimeWorkshopApiUrl(configuredWorkshopUrl)} />;
}

export function WorkshopAdminRoute({ configuredWorkshopUrl }: WorkshopRouteProps) {
  return <WorkshopAdmin workshopUrl={getRuntimeWorkshopApiUrl(configuredWorkshopUrl)} />;
}
