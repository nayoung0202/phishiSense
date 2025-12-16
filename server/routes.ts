import process from "node:process";
import nodemailer from "nodemailer";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertProjectSchema,
  insertTemplateSchema,
  insertTargetSchema,
  insertTrainingPageSchema,
  type Project,
  type InsertProject,
} from "@shared/schema";
import { z } from "zod";
import {
  addDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfISOWeek,
  endOfMonth,
  endOfQuarter,
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  endOfWeek,
} from "date-fns";

const statusParamMap: Record<string, string> = {
  running: "진행중",
  inprogress: "진행중",
  "in-progress": "진행중",
  진행중: "진행중",
  scheduled: "예약",
  예약: "예약",
  done: "완료",
  completed: "완료",
  완료: "완료",
};

const quarterNumbers = [1, 2, 3, 4] as const;

const calculateRate = (count: number | null | undefined, total: number | null | undefined) => {
  if (!total || total <= 0 || !count) return 0;
  return Math.round((count / total) * 100);
};

const toISO = (value: Date) => value.toISOString();

const normalizeProjectDate = (date: Project["startDate"]) => {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    now.setMilliseconds(0);
    return now;
  }
  return parsed;
};

const projectOverlaps = (project: Project, rangeStart: Date, rangeEnd: Date) => {
  const projectStart = normalizeProjectDate(project.startDate);
  const projectEnd = normalizeProjectDate(project.endDate);
  return projectStart <= rangeEnd && projectEnd >= rangeStart;
};

const summarizeProject = (project: Project) => ({
  id: project.id,
  name: project.name,
  status: project.status,
  department: project.department ?? "",
  startDate: toISO(normalizeProjectDate(project.startDate)),
  endDate: toISO(normalizeProjectDate(project.endDate)),
  targetCount: project.targetCount ?? 0,
  openCount: project.openCount ?? 0,
  clickCount: project.clickCount ?? 0,
  submitCount: project.submitCount ?? 0,
  weekOfYear: project.weekOfYear ?? [],
});

const projectCreateSchema = insertProjectSchema.extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

type PreviewDepartmentSlice = {
  department: string;
  count: number;
};

type PreviewTrendPoint = {
  label: string;
  metric: "count" | "rate";
  value: number;
};

type PreviewForecast = {
  openRate: number;
  clickRate: number;
  submitRate: number;
};

type PreviewTargetSample = {
  id: string;
  name: string;
  email: string;
  department: string;
  status: "예정";
};

type PreviewConflict = {
  projectId: string;
  projectName: string;
  status: string;
};

type PreviewResponse = {
  targetCount: number;
  departmentBreakdown: PreviewDepartmentSlice[];
  forecast: PreviewForecast;
  trend: PreviewTrendPoint[];
  sampleTargets: PreviewTargetSample[];
  conflicts: PreviewConflict[];
  generatedAt: string;
  cacheKey: string;
};

type ProjectValidationIssue = {
  field: string;
  code: string;
  message: string;
};

const PREVIEW_CACHE_WINDOW_MS = 2 * 60 * 1000;
const previewCache = new Map<string, { data: PreviewResponse; expiresAt: number }>();
const NODEMAILER_VERSION =
  (nodemailer as unknown as { version?: string }).version ?? "unknown";

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => normalizeOptionalString(entry)).filter(Boolean);
};

const toSafeDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
};

const previewRequestSchema = z.object({
  targetIds: z.array(z.string().trim().min(1)).default([]),
  templateId: z.string().trim().min(1).nullish(),
  sendingDomain: z.string().trim().min(1).nullish(),
  startDate: z.string().trim().min(1).nullish(),
  endDate: z.string().trim().min(1).nullish(),
});

const findMissingSmtpKey = () => {
  if (!process.env.SMTP_HOST) {
    return "SMTP_HOST";
  }
  if (!process.env.SMTP_USER) {
    return "SMTP_USER";
  }
  if (!process.env.SMTP_PASS) {
    return "SMTP_PASS";
  }
  return null;
};

const stripHtml = (value: string) =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildTestEmailHtml = (htmlBody: string, sendingDomain: string, recipient: string) => `
    <article style="font-family: 'Inter', 'Spoqa Han Sans Neo', sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 24px;">
      <header style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 14px; color: #64748b;">이 메일은 사전 검수를 위한 테스트 발송입니다.</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">발신 도메인: ${sendingDomain}</p>
      </header>
      <section style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: rgba(15, 23, 42, 0.04) 0 10px 30px;">
        ${htmlBody}
      </section>
      <footer style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0;">수신자: ${recipient}</p>
        <p style="margin: 4px 0 0;">PhishSense 테스트 발송 · 실 사용자에게 자동으로 전달되지 않습니다.</p>
      </footer>
    </article>
  `;

const buildPreviewCacheKey = (options: {
  projectId?: string | null;
  targetIds: string[];
  templateId?: string | null;
  sendingDomain?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}) => {
  const key = {
    projectId: options.projectId ?? null,
    targetIds: [...options.targetIds].sort(),
    templateId: options.templateId ?? null,
    sendingDomain: options.sendingDomain ?? null,
    startDate: options.startDate ?? null,
    endDate: options.endDate ?? null,
  };
  return JSON.stringify(key);
};

const calculateProjectAverages = (projects: Project[]): PreviewForecast => {
  let totalTargets = 0;
  let openTotal = 0;
  let clickTotal = 0;
  let submitTotal = 0;

  projects.forEach((project) => {
    const targetCount = project.targetCount ?? 0;
    if (targetCount <= 0) {
      return;
    }
    totalTargets += targetCount;
    openTotal += project.openCount ?? 0;
    clickTotal += project.clickCount ?? 0;
    submitTotal += project.submitCount ?? 0;
  });

  if (totalTargets <= 0) {
    return {
      openRate: 0,
      clickRate: 0,
      submitRate: 0,
    };
  }

  const normalizeRate = (value: number) =>
    Math.min(100, Number(((value / totalTargets) * 100).toFixed(1)));

  return {
    openRate: normalizeRate(openTotal),
    clickRate: normalizeRate(clickTotal),
    submitRate: normalizeRate(submitTotal),
  };
};

const buildPreviewTrend = (targetCount: number, forecast: PreviewForecast): PreviewTrendPoint[] => [
  { label: "발송", metric: "count", value: targetCount },
  { label: "오픈률", metric: "rate", value: forecast.openRate },
  { label: "클릭률", metric: "rate", value: forecast.clickRate },
  { label: "제출률", metric: "rate", value: forecast.submitRate },
];

const validateProjectPayload = (payload: InsertProject): ProjectValidationIssue[] => {
  const issues: ProjectValidationIssue[] = [];

  if (!normalizeOptionalString(payload.name)) {
    issues.push({ field: "name", code: "required", message: "프로젝트명을 입력하세요." });
  }

  const departmentTags = Array.isArray(payload.departmentTags)
    ? payload.departmentTags.map((tag) => normalizeOptionalString(tag)).filter(Boolean)
    : [];
  if (departmentTags.length === 0) {
    issues.push({
      field: "departmentTags",
      code: "required",
      message: "부서 태그를 하나 이상 선택하세요.",
    });
  }

  if (!normalizeOptionalString(payload.templateId)) {
    issues.push({
      field: "templateId",
      code: "required",
      message: "템플릿을 선택하세요.",
    });
  }

  if (!normalizeOptionalString(payload.trainingPageId)) {
    issues.push({
      field: "trainingPageId",
      code: "required",
      message: "랜딩/미리보기 페이지를 선택하세요.",
    });
  }

  const sendingDomain = normalizeOptionalString(payload.sendingDomain);
  if (!sendingDomain) {
    issues.push({
      field: "sendingDomain",
      code: "required",
      message: "발신 도메인을 선택하세요.",
    });
  }

  const fromName = normalizeOptionalString(payload.fromName);
  if (!fromName) {
    issues.push({
      field: "fromName",
      code: "required",
      message: "발신자 이름을 입력하세요.",
    });
  }

  const fromEmail = normalizeOptionalString(payload.fromEmail);
  if (!fromEmail) {
    issues.push({
      field: "fromEmail",
      code: "required",
      message: "발신 이메일을 입력하세요.",
    });
  } else if (!fromEmail.includes("@")) {
    issues.push({
      field: "fromEmail",
      code: "invalid",
      message: "올바른 이메일 주소 형식이 아닙니다.",
    });
  }

  const startDate = toSafeDate(payload.startDate);
  if (!startDate) {
    issues.push({
      field: "startDate",
      code: "required",
      message: "시작일을 입력하세요.",
    });
  }

  const endDate = toSafeDate(payload.endDate);
  if (startDate && endDate && startDate >= endDate) {
    issues.push({
      field: "endDate",
      code: "invalid_range",
      message: "종료일은 시작일 이후여야 합니다.",
    });
  }

  if (payload.targetCount != null && payload.targetCount < 0) {
    issues.push({
      field: "targetCount",
      code: "invalid",
      message: "대상자 수가 잘못되었습니다.",
    });
  }

  return issues;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const queryYear = typeof req.query.year === "string" ? Number(req.query.year) : undefined;
      const parsedYear = queryYear && !Number.isNaN(queryYear) ? queryYear : undefined;

      const rawQuarter = typeof req.query.quarter === "string" ? req.query.quarter : undefined;
      const parsedQuarter =
        rawQuarter && !Number.isNaN(Number(rawQuarter)) ? Number(rawQuarter) : undefined;

      const rawStatus = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "";
      const statusFilter = statusParamMap[rawStatus] ?? undefined;

      const searchTerm =
        typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

      const filtered = projects.filter((project) => {
        const fiscalYear =
          project.fiscalYear ??
          normalizeProjectDate(project.startDate).getFullYear();
        if (parsedYear && fiscalYear !== parsedYear) {
          return false;
        }

        const fiscalQuarter =
          project.fiscalQuarter ??
          Math.floor(normalizeProjectDate(project.startDate).getMonth() / 3) + 1;
        if (parsedQuarter && quarterNumbers.includes(parsedQuarter as (typeof quarterNumbers)[number]) && fiscalQuarter !== parsedQuarter) {
          return false;
        }

        if (statusFilter && project.status !== statusFilter) {
          return false;
        }

        if (searchTerm.length > 0) {
          const haystack = [
            project.name,
            project.department ?? "",
            project.description ?? "",
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(searchTerm)) {
            return false;
          }
        }

        return true;
      });

      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/quarter-stats", async (req, res) => {
    try {
      const yearParam =
        typeof req.query.year === "string" ? Number(req.query.year) : new Date().getFullYear();
      if (Number.isNaN(yearParam)) {
        return res.status(400).json({ error: "Invalid year parameter" });
      }

      const projects = await storage.getProjects();
      const stats = quarterNumbers.map((quarterNumber) => {
        const quarterProjects = projects.filter((project) => {
          const fiscalYear =
            project.fiscalYear ??
            normalizeProjectDate(project.startDate).getFullYear();
          if (fiscalYear !== yearParam) return false;
          const fiscalQuarter =
            project.fiscalQuarter ??
            Math.floor(normalizeProjectDate(project.startDate).getMonth() / 3) + 1;
          return fiscalQuarter === quarterNumber;
        });

        const totals = {
          total: quarterProjects.length,
          done: quarterProjects.filter((project) => project.status === "완료").length,
          running: quarterProjects.filter((project) => project.status === "진행중").length,
          scheduled: quarterProjects.filter((project) => project.status === "예약").length,
        };

        const clickRates: number[] = [];
        const submitRates: number[] = [];

        quarterProjects.forEach((project) => {
          const clickRate = calculateRate(project.clickCount, project.targetCount);
          if (clickRate > 0) clickRates.push(clickRate);
          const submitRate = calculateRate(project.submitCount, project.targetCount);
          if (submitRate > 0) submitRates.push(submitRate);
        });

        const avgClickRate =
          clickRates.length > 0
            ? Math.round(clickRates.reduce((acc, rate) => acc + rate, 0) / clickRates.length)
            : 0;
        const avgReportRate =
          submitRates.length > 0
            ? Math.round(submitRates.reduce((acc, rate) => acc + rate, 0) / submitRates.length)
            : 0;

        return {
          quarter: quarterNumber,
          total: totals.total,
          done: totals.done,
          running: totals.running,
          scheduled: totals.scheduled,
          avg_click_rate: avgClickRate,
          avg_report_rate: avgReportRate,
        };
      });

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quarter stats" });
    }
  });

  app.get("/api/projects/calendar", async (req, res) => {
    try {
      const yearParam =
        typeof req.query.year === "string" ? Number(req.query.year) : new Date().getFullYear();
      const quarterParam =
        typeof req.query.quarter === "string" ? Number(req.query.quarter) : undefined;

      if (Number.isNaN(yearParam) || !quarterParam || Number.isNaN(quarterParam)) {
        return res.status(400).json({ error: "Invalid year or quarter parameter" });
      }

      const quarterIndex = quarterParam - 1;
      if (quarterIndex < 0 || quarterIndex > 3) {
        return res.status(400).json({ error: "Quarter must be between 1 and 4" });
      }

      const quarterStart = startOfQuarter(new Date(yearParam, quarterIndex * 3, 1));
      const quarterEnd = endOfQuarter(quarterStart);

      const projects = await storage.getProjects();
      const quarterProjects = projects.filter((project) => {
        const fiscalYear =
          project.fiscalYear ??
          normalizeProjectDate(project.startDate).getFullYear();
        if (fiscalYear !== yearParam) return false;
        const fiscalQuarter =
          project.fiscalQuarter ??
          Math.floor(normalizeProjectDate(project.startDate).getMonth() / 3) + 1;
        return fiscalQuarter === quarterParam;
      });

      const months = Array.from({ length: 3 }, (_, index) => {
        const monthDate = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + index, 1);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
        const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
        const weeks = [];

        for (let i = 0; i < days.length; i += 7) {
          const weekSlice = days.slice(i, i + 7);
          weeks.push({
            start: toISO(weekSlice[0]),
            end: toISO(weekSlice[weekSlice.length - 1]),
            days: weekSlice.map((day) => {
              const dayProjects = quarterProjects
                .filter((project) => projectOverlaps(project, day, day))
                .map(summarizeProject);
              const maxVisible = 2;
              return {
                date: toISO(day),
                inMonth:
                  day.getMonth() === monthStart.getMonth() &&
                  day.getFullYear() === monthStart.getFullYear(),
                inQuarter: day >= quarterStart && day <= quarterEnd,
                projects: dayProjects.slice(0, maxVisible),
                overflowCount: Math.max(0, dayProjects.length - maxVisible),
                allProjects: dayProjects,
              };
            }),
          });
        }

        return {
          month: toISO(monthStart),
          weeks,
        };
      });

      const weeks = eachWeekOfInterval(
        { start: startOfISOWeek(quarterStart), end: endOfISOWeek(quarterEnd) },
        { weekStartsOn: 1 },
      ).map((weekStart) => {
        const weekEnd = endOfISOWeek(weekStart);
        const projectsInWeek = quarterProjects.filter((project) =>
          projectOverlaps(project, weekStart, weekEnd),
        );
        const departmentMap = new Map<string, Project[]>();
        projectsInWeek.forEach((project) => {
          const key = project.department ?? "미지정";
          if (!departmentMap.has(key)) {
            departmentMap.set(key, []);
          }
          departmentMap.get(key)!.push(project);
        });

        return {
          isoYear: getISOWeekYear(weekStart),
          isoWeek: getISOWeek(weekStart),
          start: toISO(weekStart),
          end: toISO(weekEnd),
          departments: Array.from(departmentMap.entries()).map(([department, deptProjects]) => ({
            department,
            projects: deptProjects.map(summarizeProject),
          })),
        };
      });

      res.json({ months, weeks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar data" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validated = projectCreateSchema.parse(req.body);
      const issues = validateProjectPayload(validated);
      if (issues.length > 0) {
        return res.status(422).json({
          error: "validation_failed",
          issues,
        });
      }

      const {
        departmentTags,
        notificationEmails,
        ...projectRest
      } = validated;

      const sanitized: InsertProject = {
        ...projectRest,
        departmentTags: normalizeStringArray(departmentTags),
        notificationEmails: normalizeStringArray(notificationEmails),
      };

      const project = await storage.createProject(sanitized);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          error: "validation_error",
          issues: error.issues.map((issue) => ({
            field: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        });
      }
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.post("/api/projects/:id/preview", async (req, res) => {
    try {
      const payload = previewRequestSchema.parse(req.body ?? {});
      const targetIds = payload.targetIds;

      const templateId = payload.templateId ?? undefined;
      const sendingDomain = payload.sendingDomain ?? undefined;
      const startDateParam = payload.startDate ?? undefined;
      const endDateParam = payload.endDate ?? undefined;
      const projectId =
        typeof req.params.id === "string" && req.params.id.trim().length > 0
          ? req.params.id.trim()
          : "new";

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
        return res.json(cached.data);
      }

      const [allTargets, allProjects] = await Promise.all([
        storage.getTargets(),
        storage.getProjects(),
      ]);

      const selectedTargetSet = new Set(targetIds);
      const selectedTargets =
        targetIds.length > 0
          ? allTargets.filter((target) => selectedTargetSet.has(target.id))
          : [];
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
      const sampleTargets: PreviewTargetSample[] = selectedTargets.slice(0, 3).map((target) => ({
        id: target.id,
        name: target.name,
        email: target.email,
        department: target.department ?? "미지정",
        status: "예정",
      }));

      const startDate = toSafeDate(startDateParam);
      const endDate = toSafeDate(endDateParam);
      const conflictDepartmentSet = new Set(
        departmentBreakdown.map((entry) => entry.department),
      );
      const conflicts: PreviewConflict[] =
        startDate && (targetIds.length > 0 || conflictDepartmentSet.size > 0)
          ? allProjects
              .filter((project) => {
                if (!["진행중", "예약"].includes(project.status)) {
                  return false;
                }
                const projectStart = normalizeProjectDate(project.startDate);
                const projectEnd = normalizeProjectDate(project.endDate);
                const overlaps =
                  (!endDate || projectStart <= endDate) &&
                  (!projectEnd || projectEnd >= startDate);
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

      res.json(response);
    } catch (error) {
      res.status(400).json({ error: "Failed to build preview" });
    }
  });

  app.post("/api/projects/test-send", async (req, res) => {
    res.setHeader("X-Mailer-Version", `nodemailer/${NODEMAILER_VERSION}`);
    try {
      const missingKey = findMissingSmtpKey();

      if (missingKey) {
        return res.status(503).json({
          error: "smtp_not_configured",
          reason: `${missingKey} 환경 변수가 누락되어 테스트 메일을 발송할 수 없습니다.`,
        });
      }

      const payload = z
        .object({
          templateId: z.string().min(1, "템플릿을 선택하세요."),
          sendingDomain: z.string().min(1, "발신 도메인을 선택하세요."),
          fromEmail: z.string().email("올바른 발신 이메일 주소를 입력하세요."),
          fromName: z.string().min(1, "발신자 이름을 입력하세요."),
          recipient: z.string().email("유효한 수신 이메일을 입력하세요."),
        })
        .parse(req.body);

      const template = await storage.getTemplate(payload.templateId);
      if (!template) {
        return res.status(404).json({
          error: "template_not_found",
          reason: "선택한 템플릿을 찾을 수 없습니다.",
        });
      }

      if (payload.sendingDomain.includes("inactive")) {
        return res.status(409).json({
          error: "domain_inactive",
          reason: "선택한 도메인이 비활성 상태입니다.",
        });
      }

      const smtpPort = Number(process.env.SMTP_PORT ?? 587);
      const smtpSecure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true";

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const htmlBody = template.body ?? "";
      const subject = template.subject ?? "테스트 메일";
      const prefixedSubject = `[테스트] ${subject}`;
      const composedHtml = buildTestEmailHtml(htmlBody, payload.sendingDomain, payload.recipient);
      const plainText = stripHtml(htmlBody);

      let delivery;
      try {
        delivery = await transporter.sendMail({
          envelope: {
            from: payload.fromEmail,
            to: [payload.recipient],
          },
          from: `"${payload.fromName}" <${payload.fromEmail}>`,
          to: payload.recipient,
          subject: prefixedSubject,
          html: composedHtml,
          text: plainText || undefined,
          headers: {
            "X-PhishSense-Preview": "true",
            "X-PhishSense-Sending-Domain": payload.sendingDomain,
          },
        });
      } finally {
        if (typeof transporter.close === "function") {
          transporter.close();
        }
      }

      res.json({
        status: "sent" as const,
        messageId: delivery.messageId,
        accepted: Array.isArray(delivery.accepted) ? delivery.accepted.map(String) : [],
        rejected: Array.isArray(delivery.rejected) ? delivery.rejected.map(String) : [],
        envelope: {
          from: delivery.envelope?.from ?? payload.fromEmail,
          to: Array.isArray(delivery.envelope?.to)
            ? delivery.envelope.to.map(String)
            : [payload.recipient],
        },
        response: delivery.response,
        previewUrl: (delivery as { previewUrl?: string }).previewUrl ?? null,
        processedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          error: "validation_error",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      res.status(500).json({
        error: "test_send_failed",
        reason: "테스트 메일 발송 중 오류가 발생했습니다.",
      });
    }
  });

  app.post("/api/projects/copy", async (req, res) => {
    try {
      const { ids } = z.object({
        ids: z.array(z.string().min(1)).min(1),
      }).parse(req.body);
      const projects = await storage.copyProjects(ids);
      res.status(201).json(projects);
    } catch (error) {
      res.status(400).json({ error: "Failed to copy projects" });
    }
  });

  app.patch("/api/projects/:id/status", async (req, res) => {
    try {
      const { to } = z
        .object({
          to: z.enum(["SCHEDULED", "RUNNING"]),
        })
        .parse(req.body);

      const statusMap: Record<"SCHEDULED" | "RUNNING", string> = {
        SCHEDULED: "예약",
        RUNNING: "진행중",
      };

      const updated = await storage.updateProject(req.params.id, {
        status: statusMap[to],
      });

      if (!updated) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json({
        id: updated.id,
        status: updated.status,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          error: "validation_error",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
      res.status(500).json({ error: "Failed to update project status" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const payload: Record<string, unknown> = { ...req.body };
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
      const project = await storage.updateProject(req.params.id, payload);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const validated = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(400).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Targets
  app.get("/api/targets", async (req, res) => {
    try {
      const targets = await storage.getTargets();
      res.json(targets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch targets" });
    }
  });

  app.get("/api/targets/:id", async (req, res) => {
    try {
      const target = await storage.getTarget(req.params.id);
      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json(target);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch target" });
    }
  });

  app.post("/api/targets", async (req, res) => {
    try {
      const validated = insertTargetSchema.parse(req.body);
      const target = await storage.createTarget(validated);
      res.status(201).json(target);
    } catch (error) {
      res.status(400).json({ error: "Invalid target data" });
    }
  });

  app.patch("/api/targets/:id", async (req, res) => {
    try {
      const target = await storage.updateTarget(req.params.id, req.body);
      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json(target);
    } catch (error) {
      res.status(400).json({ error: "Failed to update target" });
    }
  });

  app.delete("/api/targets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTarget(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete target" });
    }
  });

  // Training Pages
  app.get("/api/training-pages", async (req, res) => {
    try {
      const pages = await storage.getTrainingPages();
      res.json(pages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training pages" });
    }
  });

  app.get("/api/training-pages/:id", async (req, res) => {
    try {
      const page = await storage.getTrainingPage(req.params.id);
      if (!page) {
        return res.status(404).json({ error: "Training page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training page" });
    }
  });

  app.post("/api/training-pages", async (req, res) => {
    try {
      const validated = insertTrainingPageSchema.parse(req.body);
      const page = await storage.createTrainingPage(validated);
      res.status(201).json(page);
    } catch (error) {
      res.status(400).json({ error: "Invalid training page data" });
    }
  });

  app.patch("/api/training-pages/:id", async (req, res) => {
    try {
      const page = await storage.updateTrainingPage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ error: "Training page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(400).json({ error: "Failed to update training page" });
    }
  });

  app.delete("/api/training-pages/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTrainingPage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Training page not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete training page" });
    }
  });

  // Project Targets
  app.get("/api/projects/:projectId/targets", async (req, res) => {
    try {
      const targets = await storage.getProjectTargets(req.params.projectId);
      res.json(targets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project targets" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
