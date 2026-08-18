import { NextResponse } from "next/server";
import packageJson from "@/package.json";
import { getActiveDatasetVersion } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const datasetVersion = await getActiveDatasetVersion();

  return NextResponse.json({
    name: packageJson.name,
    version: packageJson.version,
    datasetVersion,
    app: "LegisVisão",
  });
}
