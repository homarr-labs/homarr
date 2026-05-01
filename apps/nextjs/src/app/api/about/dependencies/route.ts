import { NextResponse } from "next/server";

import { getDependenciesAsync } from "../../../../versions/package-reader";

export const GET = async () => {
  const dependencies = await getDependenciesAsync();
  return NextResponse.json(dependencies);
};

export const dynamic = "force-static";
