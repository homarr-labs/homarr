import { NextRequest, NextResponse } from "next/server";

import { getJobManager } from "~/lib/job-manager";

export async function POST(request: NextRequest) {
  // Only allow internal requests
  const internalHeader = request.headers.get("x-internal-request");
  if (internalHeader !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobManager = getJobManager();
    await jobManager.triggerJobsAsync();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error triggering jobs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}