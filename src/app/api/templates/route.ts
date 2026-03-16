import { NextRequest, NextResponse } from "next/server";
import { insertTemplateSchema } from "@shared/schema";
import { ZodError } from "zod";
import {
  createTemplateForTenant,
  getTemplatesForTenant,
} from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const templates = await getTemplatesForTenant(tenantId);
    return NextResponse.json(templates);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch templates");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const payload = await request.json();
    const validated = insertTemplateSchema.parse(payload);
    const template = await createTemplateForTenant(tenantId, validated);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid template data", issues: error.errors },
        { status: 400 },
      );
    }
    return buildReadyTenantErrorResponse(error, "Failed to create template");
  }
}
