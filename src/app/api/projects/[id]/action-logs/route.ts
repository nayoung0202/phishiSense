import { NextResponse } from "next/server";
import { storage } from "@/server/storage";
import type { ProjectTarget, Target } from "@shared/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ActionEventType = "OPEN" | "CLICK" | "SUBMIT";

type ActionEvent = {
  type: ActionEventType;
  label: string;
  at: string;
};

type ActionLogItem = {
  projectTargetId: string;
  targetId: string;
  name: string;
  email: string;
  department: string | null;
  status: string;
  statusCode: string;
  trackingToken: string | null;
  events: ActionEvent[];
};

const statusLabelMap: Record<string, string> = {
  sent: "발송",
  opened: "열람",
  clicked: "클릭",
  submitted: "제출",
  no_response: "미응답",
};

const toIsoString = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const resolveStatusCode = (projectTarget: ProjectTarget) => {
  if (projectTarget.status) return projectTarget.status;
  if (projectTarget.submittedAt) return "submitted";
  if (projectTarget.clickedAt) return "clicked";
  if (projectTarget.openedAt) return "opened";
  return "sent";
};

const buildEvents = (projectTarget: ProjectTarget): ActionEvent[] => {
  const events: ActionEvent[] = [];
  const openedAt = toIsoString(projectTarget.openedAt);
  const clickedAt = toIsoString(projectTarget.clickedAt);
  const submittedAt = toIsoString(projectTarget.submittedAt);

  if (openedAt) {
    events.push({ type: "OPEN", label: "열람", at: openedAt });
  }
  if (clickedAt) {
    events.push({ type: "CLICK", label: "클릭", at: clickedAt });
  }
  if (submittedAt) {
    events.push({ type: "SUBMIT", label: "제출", at: submittedAt });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};

const resolveTargetInfo = (target: Target | undefined) => ({
  name: target?.name ?? "알 수 없음",
  email: target?.email ?? "-",
  department: target?.department ?? null,
});

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await storage.getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [projectTargets, targets] = await Promise.all([
      storage.getProjectTargets(id),
      storage.getTargets(),
    ]);

    const targetMap = new Map(targets.map((target) => [target.id, target]));
    const items: ActionLogItem[] = projectTargets
      .filter((projectTarget) => projectTarget.projectId === id)
      .filter((projectTarget) => projectTarget.status !== "test")
      .map((projectTarget) => {
        const target = targetMap.get(projectTarget.targetId);
        const statusCode = resolveStatusCode(projectTarget);
        const status = statusLabelMap[statusCode] ?? statusCode;
        return {
          projectTargetId: projectTarget.id,
          targetId: projectTarget.targetId,
          trackingToken: projectTarget.trackingToken ?? null,
          ...resolveTargetInfo(target),
          status,
          statusCode,
          events: buildEvents(projectTarget),
        };
      });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to fetch action logs" }, { status: 500 });
  }
}
