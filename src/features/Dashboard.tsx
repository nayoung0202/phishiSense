"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { type Project } from "@shared/schema";
import { format } from "date-fns";
import { Users, BarChart3, Shield, TrendingUp, LineChart, Plus } from "lucide-react";

type MonthlySummary = {
  key: string;
  monthLabel: string;
  monthDate: Date;
  targetCount: number;
  openCount: number;
  clickCount: number;
  submitCount: number;
  openRate: number | null;
  clickRate: number | null;
  submitRate: number | null;
};

type QuarterlySummary = {
  key: string;
  quarterLabel: string;
  quarterDate: Date;
  targetCount: number;
  openCount: number;
  clickCount: number;
  submitCount: number;
  openRate: number | null;
  clickRate: number | null;
  submitRate: number | null;
};

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const toMonthLabel = (date: Date) => format(date, "yyyy년 MM월");

const getQuarterNumber = (date: Date) => Math.floor(date.getMonth() / 3) + 1;

const toQuarterKey = (date: Date) => `${date.getFullYear()}-Q${getQuarterNumber(date)}`;

const toQuarterLabel = (date: Date) =>
  `${date.getFullYear()}년 ${getQuarterNumber(date)}분기`;

const toQuarterStartDate = (date: Date) =>
  new Date(date.getFullYear(), (getQuarterNumber(date) - 1) * 3, 1);

const formatPercent = (value: number | null) =>
  value === null ? "-" : `${value.toFixed(1)}%`;

const formatProjectLabel = (name: string | null | undefined) => name ?? "무제 프로젝트";

export default function Dashboard() {
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const projectsByQuarter = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects.forEach((project) => {
      if (!project.startDate) return;
      const date = new Date(project.startDate);
      if (Number.isNaN(date.getTime())) return;
      const key = toQuarterKey(date);
      const list = map.get(key);
      if (list) {
        list.push(project);
      } else {
        map.set(key, [project]);
      }
    });
    return map;
  }, [projects]);

  const monthlySummaries = useMemo<MonthlySummary[]>(() => {
    if (!projects.length) return [];

    const map = new Map<string, MonthlySummary>();

    projects.forEach((project) => {
      if (!project.startDate) return;
      const date = new Date(project.startDate);
      if (Number.isNaN(date.getTime())) return;

      const key = toMonthKey(date);
      const existing = map.get(key);
      const summary =
        existing ??
        {
          key,
          monthDate: new Date(date.getFullYear(), date.getMonth(), 1),
          monthLabel: toMonthLabel(date),
          targetCount: 0,
          openCount: 0,
          clickCount: 0,
          submitCount: 0,
          openRate: null,
          clickRate: null,
          submitRate: null,
        };

      summary.targetCount += project.targetCount ?? 0;
      summary.openCount += project.openCount ?? 0;
      summary.clickCount += project.clickCount ?? 0;
      summary.submitCount += project.submitCount ?? 0;

      map.set(key, summary);
    });

    const summaries = Array.from(map.values()).map((summary) => {
      const { targetCount, openCount, clickCount, submitCount } = summary;
      const safeRate = (count: number) =>
        targetCount > 0 ? (count / targetCount) * 100 : null;

      return {
        ...summary,
        openRate: safeRate(openCount),
        clickRate: safeRate(clickCount),
        submitRate: safeRate(submitCount),
      };
    });

    summaries.sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime());
    return summaries;
  }, [projects]);

  const quarterlySummaries = useMemo<QuarterlySummary[]>(() => {
    if (!projects.length) return [];

    const map = new Map<string, QuarterlySummary>();

    projects.forEach((project) => {
      if (!project.startDate) return;
      const date = new Date(project.startDate);
      if (Number.isNaN(date.getTime())) return;

      const key = toQuarterKey(date);
      const existing = map.get(key);
      const summary =
        existing ??
        {
          key,
          quarterLabel: toQuarterLabel(date),
          quarterDate: toQuarterStartDate(date),
          targetCount: 0,
          openCount: 0,
          clickCount: 0,
          submitCount: 0,
          openRate: null,
          clickRate: null,
          submitRate: null,
        };

      summary.targetCount += project.targetCount ?? 0;
      summary.openCount += project.openCount ?? 0;
      summary.clickCount += project.clickCount ?? 0;
      summary.submitCount += project.submitCount ?? 0;

      map.set(key, summary);
    });

    const summaries = Array.from(map.values()).map((summary) => {
      const { targetCount, openCount, clickCount, submitCount } = summary;
      const safeRate = (count: number) =>
        targetCount > 0 ? (count / targetCount) * 100 : null;

      return {
        ...summary,
        openRate: safeRate(openCount),
        clickRate: safeRate(clickCount),
        submitRate: safeRate(submitCount),
      };
    });

    summaries.sort((a, b) => b.quarterDate.getTime() - a.quarterDate.getTime());
    return summaries;
  }, [projects]);

  const quartersByYear = useMemo(() => {
    const baseMap = new Map<number, Set<number>>();
    quarterlySummaries.forEach((summary) => {
      const year = summary.quarterDate.getFullYear();
      const quarter = getQuarterNumber(summary.quarterDate);
      if (!baseMap.has(year)) {
        baseMap.set(year, new Set());
      }
      baseMap.get(year)!.add(quarter);
    });
    const normalized = new Map<number, number[]>();
    baseMap.forEach((set, year) => {
      normalized.set(
        year,
        Array.from(set.values()).sort((a, b) => b - a),
      );
    });
    return normalized;
  }, [quarterlySummaries]);

  const yearOptions = useMemo(
    () =>
      Array.from(quartersByYear.keys())
        .sort((a, b) => b - a)
        .map((year) => ({
          value: String(year),
          label: `${year}년`,
        })),
    [quartersByYear],
  );

  const monthOptions = useMemo(
    () =>
      monthlySummaries.map((summary) => ({
        value: summary.key,
        label: summary.monthLabel,
      })),
    [monthlySummaries],
  );

  const [selectedMonth, setSelectedMonth] = useState<string | null>(() =>
    monthOptions.length > 0 ? monthOptions[0].value : null,
  );

  const [selectedYear, setSelectedYear] = useState<string | null>(() =>
    yearOptions.length > 0 ? yearOptions[0].value : null,
  );

  const [selectedQuarterNumber, setSelectedQuarterNumber] = useState<string | null>(() => {
    if (!yearOptions.length) return null;
    const initialYear = Number(yearOptions[0].value);
    const quarters = quartersByYear.get(initialYear) ?? [];
    return quarters.length > 0 ? String(quarters[0]) : null;
  });

  const quarterOptions = useMemo(() => {
    if (!selectedYear) return [];
    const quarters = quartersByYear.get(Number(selectedYear)) ?? [];
    return quarters.map((quarter) => ({
      value: String(quarter),
      label: `${quarter}분기`,
    }));
  }, [quartersByYear, selectedYear]);

  useEffect(() => {
    if (!monthOptions.length) {
      setSelectedMonth(null);
      return;
    }

    if (!selectedMonth || !monthOptions.some((option) => option.value === selectedMonth)) {
      setSelectedMonth(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonth]);

  useEffect(() => {
    if (!yearOptions.length) {
      setSelectedYear(null);
      return;
    }

    if (!selectedYear || !yearOptions.some((option) => option.value === selectedYear)) {
      setSelectedYear(yearOptions[0].value);
    }
  }, [yearOptions, selectedYear]);

  useEffect(() => {
    if (!selectedYear) {
      setSelectedQuarterNumber(null);
      return;
    }

    const quarters = quartersByYear.get(Number(selectedYear)) ?? [];
    if (!quarters.length) {
      setSelectedQuarterNumber(null);
      return;
    }

    if (
      !selectedQuarterNumber ||
      !quarters.includes(Number(selectedQuarterNumber))
    ) {
      setSelectedQuarterNumber(String(quarters[0]));
    }
  }, [quartersByYear, selectedYear, selectedQuarterNumber]);

  const selectedSummary =
    monthlySummaries.find((summary) => summary.key === selectedMonth) ??
    monthlySummaries[0];

  const selectedQuarterKey =
    selectedYear && selectedQuarterNumber ? `${selectedYear}-Q${selectedQuarterNumber}` : null;

  const selectedQuarterProjects = useMemo(() => {
    if (!selectedQuarterKey) return [];
    const list = projectsByQuarter.get(selectedQuarterKey);
    if (!list) return [];
    return [...list].sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      const nameA = a.name ?? "";
      const nameB = b.name ?? "";
      return nameA.localeCompare(nameB, "ko");
    });
  }, [projectsByQuarter, selectedQuarterKey]);

  const quarterComparisonData = useMemo(() => {
    if (!selectedQuarterProjects.length) return [];
    return selectedQuarterProjects.map((project, index) => {
      const targetCount = project.targetCount ?? 0;
      const rate = (count: number | null | undefined) =>
        targetCount > 0 && count ? (count / targetCount) * 100 : 0;
      return {
        index: index + 1,
        프로젝트: formatProjectLabel(project.name),
        발송수: targetCount,
        오픈률: rate(project.openCount),
        클릭률: rate(project.clickCount),
        제출률: rate(project.submitCount),
      };
    });
  }, [selectedQuarterProjects]);

  const maxQuarterTarget = useMemo(() => {
    if (!quarterComparisonData.length) return 0;
    return quarterComparisonData.reduce((max, item) => Math.max(max, item.발송수 ?? 0), 0);
  }, [quarterComparisonData]);

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">대시보드</h1>
        </div>
        <Link href="/projects/new">
          <Button data-testid="button-new-project">
            <Plus className="mr-2 h-4 w-4" />
            새 프로젝트
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">월간 훈련 현황</h2>
          {monthOptions.length > 0 && (
            <Select
              value={selectedMonth ?? undefined}
              onValueChange={(value) => setSelectedMonth(value)}
            >
              <SelectTrigger className="w-[200px]" data-testid="select-dashboard-month">
                <SelectValue placeholder="월 선택" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-lg" />
            ))
          ) : selectedSummary ? (
            <>
              <StatCard
                title="발송 수"
                value={selectedSummary.targetCount.toLocaleString()}
                icon={Users}
                description={`${selectedSummary.monthLabel} 기준`}
              />
              <StatCard
                title="오픈률"
                value={formatPercent(selectedSummary.openRate)}
                icon={BarChart3}
                description={`${selectedSummary.openCount.toLocaleString()}명 열람`}
              />
              <StatCard
                title="클릭률"
                value={formatPercent(selectedSummary.clickRate)}
                icon={TrendingUp}
                description={`${selectedSummary.clickCount.toLocaleString()}명 클릭`}
              />
              <StatCard
                title="제출률"
                value={formatPercent(selectedSummary.submitRate)}
                icon={Shield}
                description={`${selectedSummary.submitCount.toLocaleString()}명 제출`}
              />
            </>
          ) : (
            <Card className="col-span-full p-6 text-center text-muted-foreground">
              월별 데이터를 불러올 수 없습니다.
            </Card>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <LineChart className="w-5 h-5 text-primary" />
              모의훈련 현황 비교
            </h2>
            <p className="text-sm text-muted-foreground">
              연도와 분기를 선택해 해당 기간의 프로젝트 실적을 비교하세요.
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedQuarterKey
                ? `${selectedYear ?? "-"}년 ${selectedQuarterNumber ?? "-"}분기 · 총 ${selectedQuarterProjects.length.toLocaleString()}개 프로젝트`
                : "선택 가능한 분기가 없습니다."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {yearOptions.length > 0 && (
              <Select
                value={selectedYear ?? undefined}
                onValueChange={(value) => setSelectedYear(value)}
              >
                <SelectTrigger className="w-[160px]" data-testid="select-dashboard-year">
                  <SelectValue placeholder="연도 선택" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {quarterOptions.length > 0 && (
              <Select
                value={selectedQuarterNumber ?? undefined}
                onValueChange={(value) => setSelectedQuarterNumber(value)}
              >
                <SelectTrigger className="w-[150px]" data-testid="select-dashboard-quarter">
                  <SelectValue placeholder="분기 선택" />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <div className="h-[360px]">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : quarterComparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={quarterComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="index"
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                />
                <YAxis
                  yAxisId="count"
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `${value}`}
                  width={60}
                  domain={[0, Math.max(maxQuarterTarget, 10)]}
                />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `${value}%`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  labelFormatter={(value) => {
                    const entry = quarterComparisonData.find(
                      (item) => item.index === value,
                    );
                    return entry?.프로젝트 ?? "";
                  }}
                  formatter={(value, name, props) => {
                    const label = String(name);
                    if (label.endsWith("률")) {
                      return [`${Number(value).toFixed(1)}%`, label];
                    }
                    return [value, label];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="count"
                  dataKey="발송수"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="rate"
                  type="linear"
                  dataKey="오픈률"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="rate"
                  type="linear"
                  dataKey="클릭률"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="rate"
                  type="linear"
                  dataKey="제출률"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              선택한 분기에 비교할 프로젝트가 없습니다.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
