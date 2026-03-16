import { NextRequest, NextResponse } from "next/server";
import { insertTrainingPageSchema } from "@shared/schema";
import { ZodError } from "zod";
import {
  createTrainingPageForTenant,
  getTrainingPagesForTenant,
} from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const pages = await getTrainingPagesForTenant(tenantId);
    return NextResponse.json(pages);
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "Failed to fetch training pages");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const payload = await request.json();
    const validated = insertTrainingPageSchema.parse(payload);
    const page = await createTrainingPageForTenant(tenantId, validated);
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid training page", issues: error.errors },
        { status: 400 },
      );
    }
    return buildReadyTenantErrorResponse(error, "Failed to create training page");
  }
}
