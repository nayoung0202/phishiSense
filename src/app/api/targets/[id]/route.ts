import { NextRequest, NextResponse } from "next/server";
import {
  deleteTargetForTenant,
  findTargetByEmailInTenant,
  getTargetForTenant,
  updateTargetForTenant,
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
    const target = await getTargetForTenant(tenantId, id);
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    return NextResponse.json(target);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch target");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const payload = await request.json();
    const { id } = await params;
    if (typeof payload?.email === "string" && payload.email.trim().length > 0) {
      const existing = await findTargetByEmailInTenant(tenantId, payload.email);
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "duplicate_email", message: "이미 등록된 이메일입니다." },
          { status: 409 },
        );
      }
    }
    const target = await updateTargetForTenant(tenantId, id, payload);
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    return NextResponse.json(target);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to update target", 400);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const { id } = await params;
    const deleted = await deleteTargetForTenant(tenantId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to delete target");
  }
}
