import { NextRequest, NextResponse } from "next/server";
import { copyProjectsForTenant } from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const payload = await request.json();
    const ids = Array.isArray(payload?.ids)
      ? payload.ids.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const projects = await copyProjectsForTenant(tenantId, ids);
    return NextResponse.json(projects);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to copy projects");
  }
}
