import { NextResponse } from "next/server";
import { fetchGroupStageComplete } from "@/lib/standings/group-stage-status";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groupStageComplete = await fetchGroupStageComplete();
    return NextResponse.json(
      { groupStageComplete },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ groupStageComplete: false, error: message }, { status: 500 });
  }
}
