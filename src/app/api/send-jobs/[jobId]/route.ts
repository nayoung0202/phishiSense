import { NextRequest, NextResponse } from "next/server";
import { getSendJobForTenant } from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const { jobId } = await params;
    const job = await getSendJobForTenant(tenantId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Send job not found" }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch send job");
  }
}
