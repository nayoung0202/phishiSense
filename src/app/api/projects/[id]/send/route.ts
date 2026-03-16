import { NextRequest, NextResponse } from "next/server";
import { enqueueSendJobForProject } from "@/server/services/sendJobs";
import { SendValidationError } from "@/server/services/templateSendValidation";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const { id } = await params;
    const { job, created } = await enqueueSendJobForProject(tenantId, id);
    return NextResponse.json(job, { status: created ? 201 : 200 });
  } catch (error) {
    if (error instanceof SendValidationError) {
      return NextResponse.json(
        { error: "send_validation_failed", issues: error.issues },
        { status: 422 },
      );
    }
    return buildReadyTenantErrorResponse(error, "Failed to enqueue send job");
  }
}
