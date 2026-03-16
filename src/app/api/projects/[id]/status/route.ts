import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { enqueueSendJobForProject } from "@/server/services/sendJobs";
import { formatSendValidationError } from "@/server/services/templateSendValidation";
import {
  getProjectForTenant,
  updateProjectForTenant,
  validateProjectForSendForTenant,
} from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";

const statusSchema = z.object({
  to: z.enum(["SCHEDULED", "RUNNING"]),
});

const statusMap: Record<"SCHEDULED" | "RUNNING", string> = {
  SCHEDULED: "예약",
  RUNNING: "진행중",
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const body = await request.json();
    const { id } = await params;
    const { to } = statusSchema.parse(body);
    const project = await getProjectForTenant(tenantId, id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (to === "RUNNING") {
      const validation = await validateProjectForSendForTenant(tenantId, project);
      if (!validation.ok) {
        const message = formatSendValidationError(validation.issues);
        await updateProjectForTenant(tenantId, id, { sendValidationError: message });
        return NextResponse.json(
          { error: "send_validation_failed", issues: validation.issues },
          { status: 422 },
        );
      }
    }
    const updated = await updateProjectForTenant(tenantId, id, {
      status: statusMap[to],
      sendValidationError: to === "RUNNING" ? null : project.sendValidationError ?? null,
    });
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (to === "RUNNING") {
      await enqueueSendJobForProject(tenantId, id);
    }
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "validation_error",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 422 },
      );
    }
    return buildReadyTenantErrorResponse(error, "Failed to update project status");
  }
}
