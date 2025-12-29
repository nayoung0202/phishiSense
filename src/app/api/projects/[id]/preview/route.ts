import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import {
  PREVIEW_CACHE_WINDOW_MS,
  buildPreviewCacheKey,
  buildPreviewTrend,
  calculateProjectAverages,
  normalizeProjectDate,
  previewCache,
  previewRequestSchema,
  toSafeDate,
  type PreviewResponse,
  type PreviewDepartmentSlice,
} from "@/server/services/projectsShared";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const { id } = await params;
    const payload = previewRequestSchema.parse(rawBody ?? {});
    const targetIds = payload.targetIds;
    const templateId = payload.templateId ?? undefined;
    const sendingDomain = payload.sendingDomain ?? undefined;
    const startDateParam = payload.startDate ?? undefined;
    const endDateParam = payload.endDate ?? undefined;
    const projectId = id?.trim().length ? id.trim() : "new";

    const cacheKey = buildPreviewCacheKey({
      projectId,
      targetIds,
      templateId,
      sendingDomain,
      startDate: startDateParam ?? null,
      endDate: endDateParam ?? null,
    });

    const now = Date.now();
    const cached = previewCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data);
    }

    const [allTargets, allProjects] = await Promise.all([
      storage.getTargets(),
      storage.getProjects(),
    ]);

    const selectedTargetSet = new Set(targetIds);
    const selectedTargets =
      targetIds.length > 0 ? allTargets.filter((target) => selectedTargetSet.has(target.id)) : [];
    const departmentCounts = new Map<string, number>();
    selectedTargets.forEach((target) => {
      const department = target.department ?? "미지정";
      departmentCounts.set(department, (departmentCounts.get(department) ?? 0) + 1);
    });

    const departmentBreakdown: PreviewDepartmentSlice[] = Array.from(departmentCounts.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    const forecast = calculateProjectAverages(allProjects);
    const trend = buildPreviewTrend(selectedTargets.length, forecast);
    const sampleTargets = selectedTargets.slice(0, 3).map((target) => ({
      id: target.id,
      name: target.name,
      email: target.email,
      department: target.department ?? "미지정",
      status: "예정" as const,
    }));

    const startDate = toSafeDate(startDateParam);
    const endDate = toSafeDate(endDateParam);
    const conflictDepartmentSet = new Set(departmentBreakdown.map((entry) => entry.department));
    const conflicts =
      startDate && (targetIds.length > 0 || conflictDepartmentSet.size > 0)
        ? allProjects
            .filter((project) => {
              if (!["진행중", "예약"].includes(project.status)) {
                return false;
              }
              const projectStart = normalizeProjectDate(project.startDate);
              const projectEnd = normalizeProjectDate(project.endDate);
              const overlaps =
                (!endDate || projectStart <= endDate) && (!projectEnd || projectEnd >= startDate);
              if (!overlaps) {
                return false;
              }
              if (conflictDepartmentSet.size === 0) {
                return true;
              }
              const projectDept =
                project.department ??
                (Array.isArray(project.departmentTags) && project.departmentTags.length > 0
                  ? project.departmentTags[0] ?? null
                  : null);
              if (!projectDept) {
                return true;
              }
              return conflictDepartmentSet.has(projectDept);
            })
            .slice(0, 10)
            .map((project) => ({
              projectId: project.id,
              projectName: project.name,
              status: project.status,
            }))
        : [];

    const response: PreviewResponse = {
      targetCount: selectedTargets.length,
      departmentBreakdown,
      forecast,
      trend,
      sampleTargets,
      conflicts,
      generatedAt: new Date().toISOString(),
      cacheKey,
    };

    previewCache.set(cacheKey, {
      data: response,
      expiresAt: now + PREVIEW_CACHE_WINDOW_MS,
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Failed to build preview" }, { status: 400 });
  }
}
