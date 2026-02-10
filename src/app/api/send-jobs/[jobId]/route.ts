import { NextResponse } from "next/server";
import { storage } from "@/server/storage";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { jobId } = await params;
    const job = await storage.getSendJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Send job not found" }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: "Failed to fetch send job" }, { status: 500 });
  }
}
