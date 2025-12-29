import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { storage } from "@/server/storage";

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
    const updated = await storage.updateProject(id, {
      status: statusMap[to],
    });
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
