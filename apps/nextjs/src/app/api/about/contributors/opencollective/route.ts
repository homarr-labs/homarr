import { NextResponse } from "next/server";

import openCollectiveContributors from "../../../../../../../../static-data/opencollective-contributors.json";

export const GET = () => {
  return NextResponse.json(openCollectiveContributors);
};

export const dynamic = "force-static";
