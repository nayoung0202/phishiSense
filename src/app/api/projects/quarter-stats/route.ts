import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/server/storage";
import {
  calculateRate,
  normalizeProjectDate,
  quarterNumbers,
} from "@/server/services/projectsShared";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const parsedYear = yearParam ? Number(yearParam) : new Date().getFullYear();
    if (Number.isNaN(parsedYear)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
    }

    const projects = await storage.getProjects();
    const stats = quarterNumbers.map((quarterNumber) => {
      const quarterProjects = projects.filter((project) => {
        const fiscalYear =
          project.fiscalYear ?? normalizeProjectDate(project.startDate).getFullYear();
        if (fiscalYear !== parsedYear) return false;
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

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Failed to fetch quarter stats" }, { status: 500 });
  }
}
