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
import { Link } from "wouter";
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

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const toMonthLabel = (date: Date) => format(date, "yyyy년 MM월");

const formatPercent = (value: number | null) =>
  value === null ? "-" : `${value.toFixed(1)}%`;

const extractPhaseLabel = (name: string) => {
  const match = name.match(/(\d+)\s*차/);
  if (match) {
    return `${match[1]}차`;
  }
  return name;
};

export default function Dashboard() {
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const projectsByMonth = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects.forEach((project) => {
      if (!project.startDate) return;
      const date = new Date(project.startDate);
      if (Number.isNaN(date.getTime())) return;
      const key = toMonthKey(date);
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

  useEffect(() => {
    if (!monthOptions.length) {
      setSelectedMonth(null);
      return;
    }

    if (!selectedMonth || !monthOptions.some((option) => option.value === selectedMonth)) {
      setSelectedMonth(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonth]);

  const selectedSummary =
    monthlySummaries.find((summary) => summary.key === selectedMonth) ??
    monthlySummaries[0];

  const selectedMonthProjects = useMemo(() => {
    if (!selectedMonth) return [];
    const list = projectsByMonth.get(selectedMonth);
    if (!list) return [];
    return [...list].sort((a, b) => {
      const nameA = a.name ?? "";
      const nameB = b.name ?? "";
      return nameA.localeCompare(nameB, "ko");
    });
  }, [projectsByMonth, selectedMonth]);

  const chartData = useMemo(() => {
    if (!selectedMonthProjects.length) return [];
    return selectedMonthProjects.map((project) => {
      const targetCount = project.targetCount ?? 0;
      const openCount = project.openCount ?? 0;
      const clickCount = project.clickCount ?? 0;
      const submitCount = project.submitCount ?? 0;
      const rate = (count: number) =>
        targetCount > 0 ? (count / targetCount) * 100 : 0;

      return {
        차수: extractPhaseLabel(project.name ?? ""),
        프로젝트명: project.name ?? "",
        발송수: targetCount,
        오픈률: rate(openCount),
        클릭률: rate(clickCount),
        제출률: rate(submitCount),
      };
    });
  }, [selectedMonthProjects]);

  const maxTargetCount = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.reduce((max, item) => Math.max(max, item.발송수 ?? 0), 0);
  }, [chartData]);

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">대시보드</h1>
          <p className="text-muted-foreground">
            월별 모의훈련 지표를 확인하고 추세를 비교하세요
          </p>
        </div>
        <Link href="/projects/new">
          <Button data-testid="button-new-project">
            <Plus className="mr-2 h-4 w-4" />
            신규 프로젝트
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
              선택한 월의 프로젝트별 실적을 비교하세요.
            </p>
          </div>
        </div>
        <div className="h-[360px]">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="차수"
                  stroke="hsl(var(--muted-foreground))"
                  interval={0}
                  tickMargin={12}
                />
                <YAxis
                  yAxisId="count"
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `${value}`}
                  width={60}
                  domain={[0, Math.max(maxTargetCount, 10)]}
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
              선택한 월에 표시할 프로젝트가 없습니다.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
