import type { McpConsentNativeErrorReason } from "~/app/api/mcp/oauth/_grant";
import { ConsentProblem } from "../_consent-problem";

interface McpConsentErrorPageProps {
  searchParams: Promise<{ reason?: string | string[] }>;
}

export default async function McpConsentErrorPage({ searchParams }: McpConsentErrorPageProps) {
  const { reason: suppliedReason } = await searchParams;
  const reason: McpConsentNativeErrorReason | "unknown" =
    suppliedReason === "invalid_request" || suppliedReason === "access_denied" || suppliedReason === "server_error"
      ? suppliedReason
      : "unknown";

  return <ConsentProblem reason={reason} />;
}
