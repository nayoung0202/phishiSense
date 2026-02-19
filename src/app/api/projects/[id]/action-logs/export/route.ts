import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
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
  sentAt: string | null;
  status: string;
  events: ActionEvent[];
};

type TimelineRow = {
  targetName: string;
  targetEmail: string;
  department: string;
  eventLabel: string;
  eventType: string;
  eventAt: string;
  sentAt: string;
  status: string;
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

const sanitizeFileSegment = (value: string) => {
  const normalized = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > 0 ? normalized.slice(0, 40) : "project";
};

const buildContentDisposition = (filename: string) => {
  const fallback = filename.replace(/[^\x20-\x7E]/g, "_") || "timeline.xlsx";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

const buildTimelineRows = (items: ActionLogItem[]): TimelineRow[] => {
  return items
    .flatMap((item) =>
      item.events.map((event) => ({
        targetName: item.name,
        targetEmail: item.email,
        department: item.department ?? "-",
        eventLabel: event.label,
        eventType: event.type,
        eventAt: event.at,
        sentAt: item.sentAt ?? "-",
        status: item.status,
      })),
    )
    .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
};

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
          sentAt: toIsoString(projectTarget.sentAt),
          ...resolveTargetInfo(target),
          status,
          events: buildEvents(projectTarget),
        };
      });

    const rows = buildTimelineRows(items);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("이벤트 타임라인");

    worksheet.columns = [
      { header: "번호", key: "index", width: 8 },
      { header: "대상자", key: "targetName", width: 18 },
      { header: "이메일", key: "targetEmail", width: 28 },
      { header: "부서", key: "department", width: 18 },
      { header: "이벤트", key: "eventLabel", width: 12 },
      { header: "유형", key: "eventType", width: 12 },
      { header: "이벤트 시각(ISO)", key: "eventAt", width: 28 },
      { header: "발송 시각(ISO)", key: "sentAt", width: 28 },
      { header: "상태", key: "status", width: 12 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };

    if (rows.length === 0) {
      worksheet.addRow({
        index: 1,
        targetName: "이벤트 데이터가 없습니다.",
      });
    } else {
      rows.forEach((row, index) => {
        worksheet.addRow({ index: index + 1, ...row });
      });
    }

    const projectName = sanitizeFileSegment(project.name ?? project.id);
    const filename = `${projectName}_event_timeline.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": buildContentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export action logs" }, { status: 500 });
  }
}
