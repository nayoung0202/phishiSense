import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import {
  normalizeProjectDate,
  projectOverlaps,
  summarizeProject,
  toISO,
} from "@/server/services/projectsShared";
import { getProjectDepartmentDisplay } from "@shared/projectDepartment";
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfISOWeek,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "date-fns";
import type { Project } from "@shared/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = Number(searchParams.get("year") ?? new Date().getFullYear());
    const quarterParamRaw = searchParams.get("quarter");
    const quarterParam = quarterParamRaw ? Number(quarterParamRaw) : undefined;

    if (Number.isNaN(yearParam) || !quarterParam || Number.isNaN(quarterParam)) {
      return NextResponse.json({ error: "Invalid year or quarter parameter" }, { status: 400 });
    }

    const quarterIndex = quarterParam - 1;
    if (quarterIndex < 0 || quarterIndex > 3) {
      return NextResponse.json({ error: "Quarter must be between 1 and 4" }, { status: 400 });
    }

    const quarterStart = startOfQuarter(new Date(yearParam, quarterIndex * 3, 1));
    const quarterEnd = endOfQuarter(quarterStart);

    const projects = await storage.getProjects();
    const quarterProjects = projects.filter((project) => {
      const fiscalYear = project.fiscalYear ?? normalizeProjectDate(project.startDate).getFullYear();
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
        const key = getProjectDepartmentDisplay(project);
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

    return NextResponse.json({ months, weeks });
  } catch {
    return NextResponse.json({ error: "Failed to fetch calendar data" }, { status: 500 });
  }
}
