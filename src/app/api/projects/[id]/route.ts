import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import { normalizeStringArray } from "@/server/services/projectsShared";
import { getProjectPrimaryDepartment } from "@shared/projectDepartment";

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
    const targetIdsRaw = Array.isArray(payloadRaw.targetIds)
      ? (payloadRaw.targetIds as unknown[])
      : null;
    const targetIds = targetIdsRaw
      ? Array.from(
          new Set(
            targetIdsRaw
              .filter((entry): entry is string => typeof entry === "string")
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0),
          ),
        )
      : null;
    delete payload["targetIds"];
    if (targetIds) {
      delete payload["targetCount"];
    }
    if (payload["start_date"] && !payload.startDate) {
      payload.startDate = payload["start_date"];
    }
    if (payload["end_date"] && !payload.endDate) {
      payload.endDate = payload["end_date"];
    }
    if (payload.departmentTags) {
      const normalizedDepartmentTags = normalizeStringArray(payload.departmentTags);
      payload.departmentTags = normalizedDepartmentTags;
      payload.department = getProjectPrimaryDepartment({
        department:
          typeof payload.department === "string" ? payload.department : null,
        departmentTags: normalizedDepartmentTags,
      });
    }
    if (payload.notificationEmails) {
      payload.notificationEmails = normalizeStringArray(payload.notificationEmails);
    }
    let project = await storage.updateProject(id, payload);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (targetIds) {
      const canSync =
        project.status === "임시" ||
        project.status === "예약" ||
        project.status === "진행중";
      if (!canSync) {
        return NextResponse.json(project);
      }

      const existingTargets = await storage.getProjectTargets(id);
      const syncTargets = existingTargets.filter((item) => item.status !== "test");
      const existingIds = new Set(syncTargets.map((item) => item.targetId));
      const desiredIds = new Set(targetIds);
      const toAdd = targetIds.filter((targetId) => !existingIds.has(targetId));
      const toRemove = syncTargets.filter((item) => !desiredIds.has(item.targetId));

      if (toAdd.length > 0) {
        await Promise.all(
          toAdd.map((targetId) =>
            storage.createProjectTarget({
              projectId: id,
              targetId,
              status: "sent",
            }),
          ),
        );
      }

      if (toRemove.length > 0) {
        await storage.deleteProjectTargetsByIds(toRemove.map((item) => item.id));
      }

      if (toAdd.length > 0 || toRemove.length > 0) {
        const removedOpen = toRemove.filter((item) => item.openedAt).length;
        const removedClick = toRemove.filter((item) => item.clickedAt).length;
        const removedSubmit = toRemove.filter((item) => item.submittedAt).length;
        const currentOpen = project.openCount ?? 0;
        const currentClick = project.clickCount ?? 0;
        const currentSubmit = project.submitCount ?? 0;
        const nextTargetCount = Math.max(0, syncTargets.length - toRemove.length + toAdd.length);

        project =
          (await storage.updateProject(id, {
            targetCount: nextTargetCount,
            openCount: Math.max(0, currentOpen - removedOpen),
            clickCount: Math.max(0, currentClick - removedClick),
            submitCount: Math.max(0, currentSubmit - removedSubmit),
          })) ?? project;
      }
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
