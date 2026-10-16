import { createFileRoute } from "@tanstack/react-router";
import { RemoteConsole } from "../components/remote-console";

export const Route = createFileRoute("/")({ component: RemoteConsole });
