import { NextRequest, NextResponse } from "next/server";
import { getProjectTargetsForTenant } from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const { id } = await params;
    const targets = await getProjectTargetsForTenant(tenantId, id);
    return NextResponse.json(targets);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch project targets");
  }
}
