import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertProjectSchema,
  insertTemplateSchema,
  insertTargetSchema,
  insertTrainingPageSchema,
  type Project,
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
      const validated = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validated);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
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

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const payload: Record<string, unknown> = { ...req.body };
      if (payload["start_date"] && !payload.startDate) {
        payload.startDate = payload["start_date"];
      }
      if (payload["end_date"] && !payload.endDate) {
        payload.endDate = payload["end_date"];
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
