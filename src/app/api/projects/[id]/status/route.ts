import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { storage } from "@/server/storage";
import { enqueueSendJobForProject } from "@/server/services/sendJobs";
import { formatSendValidationError, validateProjectForSend } from "@/server/services/templateSendValidation";

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
    const body = await request.json();
    const { id } = await params;
    const { to } = statusSchema.parse(body);
    const project = await storage.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (to === "RUNNING") {
      const validation = await validateProjectForSend(storage, project);
      if (!validation.ok) {
        const message = formatSendValidationError(validation.issues);
        await storage.updateProject(id, { sendValidationError: message });
        return NextResponse.json(
          { error: "send_validation_failed", issues: validation.issues },
          { status: 422 },
        );
      }
    }
    const updated = await storage.updateProject(id, {
      status: statusMap[to],
      sendValidationError: to === "RUNNING" ? null : project.sendValidationError ?? null,
    });
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (to === "RUNNING") {
      await enqueueSendJobForProject(id);
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
    return NextResponse.json({ error: "Failed to update project status" }, { status: 500 });
  }
}
