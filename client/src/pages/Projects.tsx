import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarRange,
  Copy,
  FileText,
  Kanban,
  LayoutList,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import {
  format,
  addDays,
  differenceInHours,
  startOfISOWeek,
} from "date-fns";
import type { Project } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type StatusFilter = "all" | "예약" | "진행중" | "완료";
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
type ViewMode = "list" | "board" | "calendar";
type CalendarMode = "month" | "timeline";

type QuarterStatsItem = {
  quarter: number;
  total: number;
  done: number;
  running: number;
  scheduled: number;
  avg_click_rate: number;
  avg_report_rate: number;
};

type CalendarProjectSummary = {
  id: string;
  name: string;
  status: string;
  department: string;
  startDate: string;
  endDate: string;
};

type CalendarDaySummary = {
  date: string;
  inMonth: boolean;
  inQuarter: boolean;
  projects: CalendarProjectSummary[];
  overflowCount: number;
  allProjects: CalendarProjectSummary[];
};

type CalendarWeekDaySummary = {
  start: string;
  end: string;
  days: CalendarDaySummary[];
};

type CalendarMonthSummary = {
  month: string;
  weeks: CalendarWeekDaySummary[];
};

type CalendarWeekDepartment = {
  department: string;
  projects: CalendarProjectSummary[];
};

type CalendarWeekSummary = {
  isoYear: number;
  isoWeek: number;
  start: string;
  end: string;
  departments: CalendarWeekDepartment[];
};

type CalendarResponse = {
  months: CalendarMonthSummary[];
  weeks: CalendarWeekSummary[];
};

type UpdateProjectPayload = {
  id: string;
  updates: Partial<Project>;
  successMessage?: string;
};

type QuarterGroup = {
  key: string;
  year: number;
  quarter: Quarter;
  label: string;
  projects: Project[];
  statusCounts: Record<StatusFilter, number>;
};

/* -------------------------------------------------------------------------- */
/*                                 Constants                                  */
/* -------------------------------------------------------------------------- */

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "예약", label: "예약" },
  { value: "진행중", label: "진행중" },
  { value: "완료", label: "완료" },
];

const statusColor: Record<string, string> = {
  예약: "bg-blue-500/20 text-blue-500",
  진행중: "bg-orange-500/20 text-orange-500",
  완료: "bg-green-500/20 text-green-500",
};

const statusAccent: Record<string, string> = {
  예약: "bg-blue-500/80 text-white",
  진행중: "bg-orange-500/80 text-white",
  완료: "bg-green-500/80 text-white",
};

const quarterOrder: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

const viewModeOptions: { value: ViewMode; label: string; icon: typeof LayoutList }[] = [
  { value: "list", label: "리스트", icon: LayoutList },
  { value: "board", label: "보드", icon: Kanban },
  { value: "calendar", label: "캘린더", icon: CalendarRange },
];

const calendarModeOptions: { value: CalendarMode; label: string }[] = [
  { value: "month", label: "달력" },
  { value: "timeline", label: "타임라인" },
];

const statusQueryMap: Record<StatusFilter, string | undefined> = {
  all: undefined,
  예약: "scheduled",
  진행중: "running",
  완료: "done",
};

const quarterNumberMap: Record<Quarter, number> = {
  Q1: 1,
  Q2: 2,
  Q3: 3,
  Q4: 4,
};

const numberToQuarter: Record<number, Quarter> = {
  1: "Q1",
  2: "Q2",
  3: "Q3",
  4: "Q4",
};

/* -------------------------------------------------------------------------- */
/*                               Util Functions                               */
/* -------------------------------------------------------------------------- */

async function fetchJson<T>(url: string): Promise<T> {
  const res = await apiRequest("GET", url);
  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    const fallback = await res.text();
    throw new Error(
      fallback || "서버가 올바른 JSON 응답을 반환하지 않았습니다.",
    );
  }
  return (await res.json()) as T;
}

function calculateRate(count: number | null | undefined, total: number | null | undefined) {
  if (!total || total <= 0 || !count) return 0;
  return Math.round((count / total) * 100);
}

function parseSearchTerm(raw: string) {
  const tokens = raw
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  let year: number | null = null;
  let quarter: Quarter | null = null;
  const rest: string[] = [];

  tokens.forEach((token) => {
    const match = token.match(/^(\d{4}):q([1-4])$/i);
    if (match) {
      year = Number(match[1]);
      quarter = numberToQuarter[Number(match[2])];
      return;
    }
    const yearMatch = token.match(/^(\d{4})$/);
    if (yearMatch && !year) {
      year = Number(yearMatch[1]);
      return;
    }
    const quarterMatch = token.match(/^q([1-4])$/i);
    if (quarterMatch && !quarter) {
      quarter = numberToQuarter[Number(quarterMatch[1])];
      return;
    }
    rest.push(token);
  });

  return {
    normalized: rest.join(" ").toLowerCase(),
    year,
    quarter,
  };
}

function toDate(value: Date | string): Date {
  if (value instanceof Date) return new Date(value);
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date();
  fallback.setMilliseconds(0);
  return fallback;
}

function formatPercent(value: number) {
  return `${Math.max(0, value)}%`;
}

const statusFilterFromProject = (project: Project): StatusFilter => {
  if (project.status === "예약") return "예약";
  if (project.status === "진행중") return "진행중";
  if (project.status === "완료") return "완료";
  return "all";
};

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export default function Projects() {
  const { toast } = useToast();
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>(
    quarterOrder[Math.floor(today.getMonth() / 3)],
  );
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [reportProject, setReportProject] = useState<Project | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [dayModalContent, setDayModalContent] = useState<{
    date: string;
    projects: CalendarProjectSummary[];
  } | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [dragInfo, setDragInfo] = useState<
    | {
        projectId: string;
        durationMs: number;
        offsetMs: number;
      }
    | null
  >(null);

  const searchMeta = useMemo(() => parseSearchTerm(searchTerm), [searchTerm]);

  useEffect(() => {
    if (searchMeta.year) {
      setSelectedYear(searchMeta.year);
    }
  }, [searchMeta.year]);

  useEffect(() => {
    if (searchMeta.quarter) {
      setSelectedQuarter(searchMeta.quarter);
    }
  }, [searchMeta.quarter]);

  const statusParam = statusQueryMap[statusFilter];
  const quarterNumber = quarterNumberMap[selectedQuarter];
  const searchQuery = searchMeta.normalized;

  const availableYearsQuery = useQuery({
    queryKey: ["projects", "available-years"] as const,
    queryFn: async () => {
      const list = await fetchJson<Project[]>("/api/projects");
      const years = new Set<number>();
      list.forEach((project) => {
        const start = toDate(project.startDate);
        years.add(start.getFullYear());
      });
      const sorted = Array.from(years).sort((a, b) => b - a);
      return sorted.length > 0 ? sorted : [today.getFullYear()];
    },
    staleTime: Infinity,
  });

  const yearOptions = useMemo(() => {
    const years = availableYearsQuery.data ?? [today.getFullYear()];
    if (!years.includes(selectedYear)) {
      return [selectedYear, ...years];
    }
    return years;
  }, [availableYearsQuery.data, selectedYear, today]);

  const projectsQuery = useQuery({
    queryKey: [
      "projects",
      {
        year: selectedYear,
        quarter: quarterNumber,
        status: statusParam,
        search: searchQuery,
      },
    ] as const,
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [
        string,
        {
          year: number;
          quarter: number;
          status: string | undefined;
          search: string;
        },
      ];
      const queryString = new URLSearchParams({
        year: String(params.year),
        quarter: String(params.quarter),
      });
      if (params.status) queryString.set("status", params.status);
      if (params.search) queryString.set("q", params.search);
      return await fetchJson<Project[]>(`/api/projects?${queryString.toString()}`);
    },
  });

  const quarterStatsQuery = useQuery({
    queryKey: ["projects-quarter-stats", selectedYear] as const,
    queryFn: async ({ queryKey }) => {
      const [, year] = queryKey;
      return await fetchJson<QuarterStatsItem[]>(`/api/projects/quarter-stats?year=${year}`);
    },
  });

  const calendarQuery = useQuery({
    queryKey: [
      "projects-calendar",
      { year: selectedYear, quarter: quarterNumber },
    ] as const,
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [
        string,
        { year: number; quarter: number },
      ];
      return await fetchJson<CalendarResponse>(
        `/api/projects/calendar?year=${params.year}&quarter=${params.quarter}`,
      );
    },
    enabled: viewMode === "calendar",
  });

  const projects = projectsQuery.data ?? [];
  const quarterStats = quarterStatsQuery.data ?? [];
  const calendarData = calendarQuery.data ?? { months: [], weeks: [] };

  useEffect(() => {
    if (viewMode !== "list" && selectedProjects.length > 0) {
      setSelectedProjects([]);
    }
  }, [viewMode, selectedProjects.length]);

  useEffect(() => {
    setSelectedProjects((prev) =>
      prev.filter((id) => projects.some((project) => project.id === id)),
    );
  }, [projects]);

  const invalidateProjectData = () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["projects-quarter-stats"] });
    queryClient.invalidateQueries({ queryKey: ["projects-calendar"] });
  };

  const copyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", "/api/projects/copy", { ids });
      const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("application/json")) {
        const fallback = await res.text();
        throw new Error(
          fallback || "서버가 올바른 JSON 응답을 반환하지 않았습니다.",
        );
      }
      return (await res.json()) as Project[];
    },
    onSuccess: (copiedProjects) => {
      invalidateProjectData();
      setSelectedProjects([]);
      toast({
        title: "프로젝트 복사 완료",
        description: `${copiedProjects.length}개의 프로젝트가 복제되었습니다.`,
      });
    },
    onError: (error) => {
      toast({
        title: "복사 실패",
        description: error.message ?? "프로젝트 복사에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      invalidateProjectData();
    },
  });

  const updateProjectMutation = useMutation<Project, Error, UpdateProjectPayload>({
    mutationFn: async ({ id, updates }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, updates);
      return (await res.json()) as Project;
    },
    onSuccess: (project, variables) => {
      invalidateProjectData();
      toast({
        title: variables.successMessage ?? "프로젝트가 업데이트되었습니다.",
        description: `${project.name} 일정이 변경되었습니다.`,
      });
    },
    onError: (error) => {
      toast({
        title: "업데이트 실패",
        description: error.message ?? "프로젝트 일정을 업데이트할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  const updateProjectDates = (projectId: string, startDate: Date, endDate: Date, message: string) => {
    updateProjectMutation.mutate({
      id: projectId,
      updates: {
        startDate,
        endDate,
      },
      successMessage: message,
    });
  };

  const quarterGroup = useMemo<QuarterGroup>(() => {
    const key = `${selectedYear}-${selectedQuarter}`;
    const statusCounts: Record<StatusFilter, number> = {
      all: projects.length,
      예약: 0,
      진행중: 0,
      완료: 0,
    };

    projects.forEach((project) => {
      const status = project.status as StatusFilter;
      if (statusCounts[status] !== undefined) {
        statusCounts[status] += 1;
      }
    });

    return {
      key,
      year: selectedYear,
      quarter: selectedQuarter,
      label: `${selectedYear} · ${selectedQuarter}`,
      projects,
      statusCounts,
    };
  }, [projects, selectedYear, selectedQuarter]);

  const quarterStatItem = useMemo(() =>
    quarterStats.find((item) => item.quarter === quarterNumber) ?? null,
  [quarterStats, quarterNumber]);

  const selectedProjectDetails = useMemo(() =>
    projects.filter((project) => selectedProjects.includes(project.id)),
  [projects, selectedProjects]);

  const comparisonData = useMemo(() =>
    selectedProjectDetails.map((project) => {
      const start = toDate(project.startDate);
      const end = toDate(project.endDate);
      return {
        id: project.id,
        name: project.name,
        department: project.department ?? "-",
        status: project.status,
        발송수: project.targetCount ?? 0,
        오픈률: calculateRate(project.openCount, project.targetCount),
        클릭률: calculateRate(project.clickCount, project.targetCount),
        제출률: calculateRate(project.submitCount, project.targetCount),
        period: `${format(start, "yyyy-MM-dd")} ~ ${format(end, "yyyy-MM-dd")}`,
      };
    }),
  [selectedProjectDetails]);

  const isAllSelected = projects.length > 0 &&
    projects.every((project) => selectedProjects.includes(project.id));

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(projects.map((project) => project.id));
      return;
    }
    setSelectedProjects([]);
  };

  const toggleProjectSelection = (projectId: string, checked: boolean) => {
    setSelectedProjects((prev) => {
      if (checked) {
        if (prev.includes(projectId)) return prev;
        return [...prev, projectId];
      }
      return prev.filter((id) => id !== projectId);
    });
  };

  const handleReportDialogChange = (open: boolean) => {
    setIsReportOpen(open);
    if (!open) setReportProject(null);
  };

  const openReport = (project: Project) => {
    setReportProject(project);
    setIsReportOpen(true);
  };

  const downloadReport = () => {
    if (!reportProject) return;
    toast({
      title: "보고서 기능 준비 중",
      description: "후속 단계에서 Word 다운로드가 제공될 예정입니다.",
    });
  };

  const yearQuarterPrefill = `?year=${selectedYear}&quarter=${quarterNumber}`;

  const selectedWeekLabel = (week: CalendarWeekSummary) =>
    `${week.isoYear}년 ${week.isoWeek}주`;

  const openDayModal = (payload: { date: string; projects: CalendarProjectSummary[] }) => {
    setDayModalContent(payload);
    setIsDayModalOpen(true);
  };

  const closeDayModal = () => {
    setIsDayModalOpen(false);
    setDayModalContent(null);
  };

  const openDetailPanel = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId) ?? null;
    setDetailProject(project);
  };

  const closeDetailPanel = () => {
    setDetailProject(null);
  };

  const handleTimelineDragStart = (projectSummary: CalendarProjectSummary) =>
    (event: DragEvent<HTMLButtonElement>) => {
      const project = projects.find((item) => item.id === projectSummary.id);
      if (!project) return;
      const startDate = toDate(project.startDate);
      const endDate = toDate(project.endDate);
      const weekStart = startOfISOWeek(startDate);
      setDragInfo({
        projectId: projectSummary.id,
        durationMs: endDate.getTime() - startDate.getTime(),
        offsetMs: startDate.getTime() - weekStart.getTime(),
      });
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", projectSummary.id);
    };

  const handleTimelineDragEnd = () => {
    setDragInfo(null);
  };

  const handleWeekDrop = (week: CalendarWeekSummary) =>
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const projectId = event.dataTransfer.getData("text/plain");
      if (!projectId) return;
      const project = projects.find((item) => item.id === projectId);
      if (!project) return;
      const info = dragInfo || {
        projectId,
        durationMs: toDate(project.endDate).getTime() - toDate(project.startDate).getTime(),
        offsetMs: 0,
      };
      const newWeekStart = toDate(week.start);
      const newStart = new Date(newWeekStart.getTime() + info.offsetMs);
      const newEnd = new Date(newStart.getTime() + info.durationMs);
      updateProjectDates(projectId, newStart, newEnd, "일정이 이동되었습니다.");
      setDragInfo(null);
    };

  const handleWeekDragOver = () => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const adjustProjectByDays = (
    projectId: string,
    adjustment: number,
    target: "start" | "end",
  ) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const startDate = toDate(project.startDate);
    const endDate = toDate(project.endDate);
    if (target === "start") {
      const updatedStart = addDays(startDate, adjustment);
      if (updatedStart > endDate) {
        toast({
          title: "시작일이 종료일보다 늦을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      updateProjectDates(projectId, updatedStart, endDate, "시작일이 조정되었습니다.");
    } else {
      const updatedEnd = addDays(endDate, adjustment);
      if (updatedEnd < startDate) {
        toast({
          title: "종료일이 시작일보다 빠를 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      updateProjectDates(projectId, startDate, updatedEnd, "종료일이 조정되었습니다.");
    }
  };

  const renderQuarterHighlights = () => (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{quarterGroup.label}</h2>
          <p className="text-sm text-muted-foreground">
            {quarterGroup.projects.length}개 프로젝트 · 예약 {quarterGroup.statusCounts["예약"]}개 · 진행중 {quarterGroup.statusCounts["진행중"]}개 · 완료 {quarterGroup.statusCounts["완료"]}개
          </p>
        </div>
        {quarterStatItem ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>평균 클릭률 {formatPercent(quarterStatItem.avg_click_rate)}</span>
            <span>평균 신고율 {formatPercent(quarterStatItem.avg_report_rate)}</span>
          </div>
        ) : null}
      </div>
    </Card>
  );

  const renderListView = () => (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead>프로젝트명</TableHead>
              <TableHead>일정</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>대상자 수</TableHead>
              <TableHead>오픈률</TableHead>
              <TableHead>클릭률</TableHead>
              <TableHead>제출률</TableHead>
              <TableHead>부서</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => {
              const start = toDate(project.startDate);
              const end = toDate(project.endDate);
              const isStartingSoon = project.status === "예약" &&
                differenceInHours(start, today) >= 0 &&
                differenceInHours(start, today) <= 24;
              return (
                <TableRow key={project.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={(checked) =>
                        toggleProjectSelection(project.id, Boolean(checked))
                      }
                      data-testid={`checkbox-project-${project.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <span>{project.name}</span>
                      <Badge variant="secondary" className="w-fit">
                        {`${format(start, "yyyy")}·${numberToQuarter[quarterNumber]}`}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(start, "yyyy-MM-dd")} ~ {format(end, "yyyy-MM-dd")}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className={`${statusColor[project.status] ?? ""} ${isStartingSoon ? "ring-2 ring-orange-400 ring-offset-2" : ""}`}>
                          {project.status}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {project.status === "예약"
                          ? `${format(start, "MM/dd HH:mm")} 시작 예정`
                          : `진행 기간 ${format(start, "MM/dd HH:mm")} ~ ${format(end, "MM/dd HH:mm")}`}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{project.targetCount?.toLocaleString() ?? 0}명</TableCell>
                  <TableCell>{calculateRate(project.openCount, project.targetCount)}%</TableCell>
                  <TableCell>{calculateRate(project.clickCount, project.targetCount)}%</TableCell>
                  <TableCell>{calculateRate(project.submitCount, project.targetCount)}%</TableCell>
                  <TableCell>{project.department ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="ghost" size="sm">상세</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => openReport(project)}>
                        보고서
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("정말 삭제하시겠습니까?")) {
                            deleteMutation.mutate(project.id);
                          }
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {projects.length === 0 ? (
        <CardContent className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
          표시할 프로젝트가 없습니다. 조건을 변경해보세요.
        </CardContent>
      ) : null}
    </Card>
  );

  const renderBoardView = () => {
    const columns: Record<string, Project[]> = {
      예약: [],
      진행중: [],
      완료: [],
    };
    projects.forEach((project) => {
      if (!columns[project.status]) columns[project.status] = [];
      columns[project.status].push(project);
    });

    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Object.entries(columns).map(([status, list]) => (
          <Card key={status} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{status}</h3>
              <Badge className={statusColor[status] ?? ""}>{list.length}</Badge>
            </div>
            <div className="space-y-3">
              {list.map((project) => {
                const start = toDate(project.startDate);
                const end = toDate(project.endDate);
                return (
                  <Card key={project.id} className="p-3 space-y-2 border border-dashed">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{project.name}</span>
                      <Badge variant="outline">{project.department ?? "-"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(start, "MM/dd")} ~ {format(end, "MM/dd")}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>대상 {project.targetCount ?? 0}명</span>
                      <span>클릭 {calculateRate(project.clickCount, project.targetCount)}%</span>
                    </div>
                  </Card>
                );
              })}
              {list.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  해당 상태의 프로젝트가 없습니다.
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderCalendarMonth = () => (
    <div className="grid gap-6 lg:grid-cols-3">
      {calendarData.months.map((month) => {
        const monthDate = toDate(month.month);
        return (
          <Card key={month.month} className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">
              {format(monthDate, "yyyy년 MM월")}
            </h3>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <div key={day} className="text-center text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {month.weeks.flatMap((week) =>
                week.days.map((day) => {
                  const date = toDate(day.date);
                  const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                  return (
                    <div
                      key={day.date}
                      className={`min-h-[90px] rounded-md border p-1 ${
                        day.inQuarter ? "bg-background" : "bg-muted/20"
                      } ${isToday ? "ring-2 ring-primary" : ""}`}
                    >
                      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{date.getDate()}</span>
                        {day.overflowCount > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-1 py-0 text-[10px]"
                            onClick={() => openDayModal({ date: day.date, projects: day.allProjects })}
                          >
                            +{day.overflowCount}
                          </Button>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        {day.projects.slice(0, 2).map((project) => (
                          <Tooltip key={project.id}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className={`block w-full truncate rounded px-1 py-0.5 text-left text-[11px] ${statusAccent[project.status] ?? "bg-primary/80 text-white"}`}
                                onClick={() => openDetailPanel(project.id)}
                              >
                                {project.name}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1 text-xs">
                                <p className="font-semibold">{project.name}</p>
                                <p>{project.department || "부서 미지정"}</p>
                                <p>{project.status}</p>
                                <p>
                                  {format(toDate(project.startDate), "MM/dd")} ~ {format(toDate(project.endDate), "MM/dd")}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-4">
      {calendarData.weeks.map((week) => (
        <Card
          key={`${week.isoYear}-${week.isoWeek}`}
          className="space-y-3 p-4"
          onDragOver={handleWeekDragOver()}
          onDrop={handleWeekDrop(week)}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {selectedWeekLabel(week)} · {format(toDate(week.start), "MM/dd")} ~ {format(toDate(week.end), "MM/dd")}
            </h3>
            {format(today, "yyyy-MM-dd") >= format(toDate(week.start), "yyyy-MM-dd") &&
            format(today, "yyyy-MM-dd") <= format(toDate(week.end), "yyyy-MM-dd") ? (
              <Badge variant="outline">이번 주</Badge>
            ) : null}
          </div>
          <div className="space-y-2">
            {week.departments.length === 0 ? (
              <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                해당 주차에 프로젝트가 없습니다.
              </div>
            ) : (
              week.departments.map((dept) => (
                <Card key={dept.department} className="border border-dashed p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold">{dept.department}</span>
                    <span>{dept.projects.length}개</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dept.projects.map((project) => (
                      <div key={project.id} className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={`rounded px-2 py-1 text-xs ${statusAccent[project.status] ?? "bg-primary/80 text-white"}`}
                              draggable
                              onDragStart={handleTimelineDragStart(project)}
                              onDragEnd={handleTimelineDragEnd}
                              onClick={() => openDetailPanel(project.id)}
                            >
                              {project.name}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1 text-xs">
                              <p className="font-semibold">{project.name}</p>
                              <p>{project.status}</p>
                              <p>
                                {format(toDate(project.startDate), "MM/dd")} ~ {format(toDate(project.endDate), "MM/dd")}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-1"
                            onClick={() => adjustProjectByDays(project.id, -1, "start")}
                          >
                            시작-1
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-1"
                            onClick={() => adjustProjectByDays(project.id, 1, "start")}
                          >
                            시작+1
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-1"
                            onClick={() => adjustProjectByDays(project.id, -1, "end")}
                          >
                            종료-1
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-1"
                            onClick={() => adjustProjectByDays(project.id, 1, "end")}
                          >
                            종료+1
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      ))}
    </div>
  );

  const renderCalendarView = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {calendarModeOptions.map((option) => (
          <Button
            key={option.value}
            variant={calendarMode === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setCalendarMode(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {calendarMode === "month" ? renderCalendarMonth() : renderTimeline()}
    </div>
  );

  const detailPanel = detailProject ? (
    <Dialog open={Boolean(detailProject)} onOpenChange={(open) => !open && closeDetailPanel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{detailProject.name}</DialogTitle>
          <DialogDescription>
            {detailProject.department ?? "부서 미지정"} · {detailProject.status}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            일정: {format(toDate(detailProject.startDate), "yyyy-MM-dd")} ~ {format(toDate(detailProject.endDate), "yyyy-MM-dd")}
          </p>
          <p>대상: {detailProject.targetCount ?? 0}명</p>
          <p>오픈률: {calculateRate(detailProject.openCount, detailProject.targetCount)}%</p>
          <p>클릭률: {calculateRate(detailProject.clickCount, detailProject.targetCount)}%</p>
          <p>제출률: {calculateRate(detailProject.submitCount, detailProject.targetCount)}%</p>
          <p className="text-muted-foreground">
            {detailProject.description ?? "설명이 등록되지 않았습니다."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => closeDetailPanel()}>
            닫기
          </Button>
          <Link href={`/projects/${detailProject.id}`}>
            <Button>상세 보기</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  const dayModal = dayModalContent ? (
    <Dialog open={isDayModalOpen} onOpenChange={(open) => !open && closeDayModal()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{format(toDate(dayModalContent.date), "yyyy년 MM월 dd일")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {dayModalContent.projects.map((project) => (
            <Card key={project.id} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{project.name}</span>
                <Badge className={statusColor[project.status] ?? ""}>{project.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(toDate(project.startDate), "MM/dd")} ~ {format(toDate(project.endDate), "MM/dd")}
              </p>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  ) : null;

  const reportDialog = (
    <Dialog open={isReportOpen} onOpenChange={handleReportDialogChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>프로젝트 보고서 미리보기</DialogTitle>
          <DialogDescription>후속 단계에서 Word 다운로드 기능이 제공될 예정입니다.</DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          {reportProject ? (
            <div className="space-y-2">
              <p>
                <span className="font-semibold">이름:</span> {reportProject.name}
              </p>
              <p>
                <span className="font-semibold">부서:</span> {reportProject.department ?? "-"}
              </p>
              <p>
                <span className="font-semibold">일정:</span> {format(toDate(reportProject.startDate), "yyyy-MM-dd")} ~ {format(toDate(reportProject.endDate), "yyyy-MM-dd")}
              </p>
              <p>{reportProject.description ?? "설명 없음"}</p>
            </div>
          ) : (
            <p>선택된 프로젝트가 없습니다.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleReportDialogChange(false)}>
            닫기
          </Button>
          <Button onClick={downloadReport}>보고서 생성</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const comparisonDialog = (
    <Dialog open={selectedProjectDetails.length >= 2} onOpenChange={(open) => !open && setSelectedProjects([])}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>비교 보고서 미리보기</DialogTitle>
          <DialogDescription>선택된 프로젝트의 주요 지표를 비교합니다.</DialogDescription>
        </DialogHeader>
        {selectedProjectDetails.length >= 2 ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {selectedProjectDetails.length}개 프로젝트 비교 중
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="count" stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => `${value}%`}
                />
                <RechartsTooltip
                  formatter={(value: unknown, name: unknown) => {
                    const label = String(name);
                    if (typeof value === "number") {
                      return label.endsWith("률")
                        ? [`${value}%`, label]
                        : [`${value.toLocaleString()}명`, label];
                    }
                    return [String(value ?? ""), label];
                  }}
                />
                <Legend />
                <Bar yAxisId="count" dataKey="발송수" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="rate" type="linear" dataKey="오픈률" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                <Line yAxisId="rate" type="linear" dataKey="클릭률" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                <Line yAxisId="rate" type="linear" dataKey="제출률" stroke="hsl(var(--chart-4))" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">비교할 프로젝트가 선택되지 않았습니다.</p>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">프로젝트 관리</h1>
          <p className="text-muted-foreground">
            연도/분기별 프로젝트를 조회하고 리스트·보드·캘린더 보기로 상황을 파악하세요.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {viewModeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.value}
                variant={viewMode === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode(option.value)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {option.label}
              </Button>
            );
          })}
          <Link href={`/projects/new${yearQuarterPrefill}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 새 프로젝트
            </Button>
          </Link>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">연도</span>
            <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ToggleGroup
            type="single"
            value={selectedQuarter}
            onValueChange={(value) => value && setSelectedQuarter(value as Quarter)}
            className="flex items-center gap-1 rounded-md border bg-background p-1"
          >
            {quarterOrder.map((quarter) => (
              <ToggleGroupItem
                key={quarter}
                value={quarter}
                className="px-3 py-1 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {quarter}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(value) => value && setStatusFilter(value as StatusFilter)}
            className="flex items-center gap-2"
          >
            {statusOptions.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="px-3 py-1 text-xs">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="프로젝트명/부서/설명 검색 또는 2025:q2 영업 형식으로 필터"
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          힌트: <code>2025:q2 영업</code>처럼 입력하면 해당 연도·분기의 특정 키워드만 조회됩니다.
        </p>
      </Card>

      {renderQuarterHighlights()}

      {viewMode === "list" && selectedProjects.length > 1 ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-4 py-3 text-sm">
          <span>{selectedProjects.length}개 프로젝트 선택됨</span>
          <Button variant="outline" size="sm" onClick={() => copyMutation.mutate(selectedProjects)}>
            <Copy className="mr-2 h-4 w-4" /> 복사
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedProjects([])}>
            선택 해제
          </Button>
        </div>
      ) : null}

      {viewMode === "list" ? renderListView() : null}
      {viewMode === "board" ? renderBoardView() : null}
      {viewMode === "calendar" ? renderCalendarView() : null}

      {reportDialog}
      {comparisonDialog}
      {detailPanel}
      {dayModal}
    </div>
  );
}
