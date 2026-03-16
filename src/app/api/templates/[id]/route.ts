import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  deleteTemplateForTenant,
  getTemplateForTenant,
  updateTemplateForTenant,
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
    const template = await getTemplateForTenant(tenantId, id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch template");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const payload = await request.json();
    const { id } = await params;
    const template = await updateTemplateForTenant(tenantId, id, payload);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid template data", issues: error.errors },
        { status: 400 },
      );
    }
    return buildReadyTenantErrorResponse(error, "Failed to update template", 400);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const { id } = await params;
    const deleted = await deleteTemplateForTenant(tenantId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to delete template");
  }
}
