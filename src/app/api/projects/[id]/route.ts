import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { normalizeStringArray } from "@/server/services/projectsShared";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await storage.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payloadRaw = await request.json();
    const payload: Record<string, unknown> = { ...payloadRaw };
    if (payload["start_date"] && !payload.startDate) {
      payload.startDate = payload["start_date"];
    }
    if (payload["end_date"] && !payload.endDate) {
      payload.endDate = payload["end_date"];
    }
    if (payload.departmentTags) {
      payload.departmentTags = normalizeStringArray(payload.departmentTags);
    }
    if (payload.notificationEmails) {
      payload.notificationEmails = normalizeStringArray(payload.notificationEmails);
    }
    const project = await storage.updateProject(id, payload);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const deleted = await storage.deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
