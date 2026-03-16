import { NextRequest, NextResponse } from "next/server";
import {
  deleteTrainingPageForTenant,
  getTrainingPageForTenant,
  updateTrainingPageForTenant,
} from "@/server/tenant/tenantStorage";
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
    const page = await getTrainingPageForTenant(tenantId, id);
    if (!page) {
      return NextResponse.json({ error: "Training page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch training page");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const payload = await request.json();
    const { id } = await params;
    const page = await updateTrainingPageForTenant(tenantId, id, payload);
    if (!page) {
      return NextResponse.json({ error: "Training page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to update training page", 400);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const { id } = await params;
    const deleted = await deleteTrainingPageForTenant(tenantId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Training page not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to delete training page");
  }
}
