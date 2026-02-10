"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SafeText } from "@/components/security/SafeText";
import { useToast } from "@/hooks/use-toast";
import { getMissingReportCaptures, hasAllReportCaptures } from "@/lib/reportCaptures";
import { ArrowLeft, Mail, Eye, MousePointer, FileText, Clock, Play } from "lucide-react";
import { type Project } from "@shared/schema";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { apiRequest } from "@/lib/queryClient";

const statusConfig: Record<string, { className: string }> = {
  "임시": { className: "bg-slate-500/20 text-slate-400" },
  "예약": { className: "bg-blue-500/20 text-blue-400" },
  "진행중": { className: "bg-orange-500/20 text-orange-400" },
  "완료": { className: "bg-green-500/20 text-green-400" },
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

type ActionLogEvent = {
  type: "OPEN" | "CLICK" | "SUBMIT";
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
  events: ActionLogEvent[];
};

type ActionLogResponse = {
  items: ActionLogItem[];
};

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActionLogItem | null>(null);

  const fetchProject = async (): Promise<Project> => {
    if (!projectId) {
      throw new Error("프로젝트 ID가 없습니다.");
    }
    const res = await apiRequest("GET", `/api/projects/${projectId}`);
    return (await res.json()) as Project;
  };
  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: Boolean(projectId),
    queryFn: fetchProject,
  });

  const fetchActionLogs = async (): Promise<ActionLogResponse> => {
    const res = await apiRequest("GET", `/api/projects/${projectId}/action-logs`);
    return (await res.json()) as ActionLogResponse;
  };

  const {
    data: actionLogs,
    isLoading: isActionLogsLoading,
  } = useQuery<ActionLogResponse>({
    queryKey: ["/api/projects", projectId, "action-logs"],
    enabled: Boolean(projectId),
    queryFn: fetchActionLogs,
  });

  const actionLogItems = Array.isArray(actionLogs?.items) ? actionLogs.items : [];
  const timelineItems = actionLogItems
    .flatMap((item) => {
      const events = Array.isArray(item.events) ? item.events : [];
      return events.map((event) => ({
        ...event,
        targetName: item.name,
      }));
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  const formatEventTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return format(parsed, "yyyy-MM-dd HH:mm");
  };

  const startProjectMutation = useMutation({
    mutationFn: async (target: Project) => {
      const res = await apiRequest("PATCH", `/api/projects/${target.id}/status`, {
        to: "RUNNING",
      });
      return (await res.json()) as { id: string; status: string };
    },
    onSuccess: (_response, target) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "프로젝트 시작",
        description: `${target.name} 프로젝트가 진행중으로 전환되었습니다.`,
      });
    },
    onError: (error) => {
      toast({
        title: "시작 실패",
        description: error.message ?? "프로젝트를 시작할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateReport = async () => {
    if (!project || isReportGenerating) return;
    if (!hasAllReportCaptures(project)) {
      const missing = getMissingReportCaptures(project).map((field) => field.label);
      alert(`보고서 캡처 이미지가 누락되었습니다: ${missing.join(", ")}`);
      return;
    }
    setIsReportGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "보고서 생성에 실패했습니다.");
      }
      const payload = (await res.json()) as { downloadUrl?: string };
      if (!payload.downloadUrl) {
        throw new Error("보고서 다운로드 주소를 찾지 못했습니다.");
      }
      window.location.href = payload.downloadUrl;
      toast({ title: "보고서 생성 완료", description: "보고서를 다운로드합니다." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "보고서 생성에 실패했습니다.";
      toast({ title: "보고서 생성 실패", description: message, variant: "destructive" });
    } finally {
      setIsReportGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="text-center py-12 space-y-4">
          <p>프로젝트 정보를 불러오지 못했습니다.</p>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message ?? "잠시 후 다시 시도하거나 목록으로 돌아가세요."}
          </p>
          <Link href="/projects">
            <Button>프로젝트 목록으로</Button>
          </Link>
        </div>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12 space-y-4">
          <p>프로젝트 정보를 찾을 수 없습니다.</p>
          <Link href="/projects">
            <Button>프로젝트 목록으로</Button>
          </Link>
        </div>
      </div>
    );
  }

  const calculateRate = (count: number | null, total: number | null) => {
    if (!total || !count) return 0;
    return Math.round((count / total) * 100);
  };

  const openRate = calculateRate(project.openCount, project.targetCount);
  const clickRate = calculateRate(project.clickCount, project.targetCount);
  const submitRate = calculateRate(project.submitCount, project.targetCount);

  // Mock data for charts
  const timeSeriesData = [
    { name: '발송', value: project.targetCount || 0 },
    { name: '오픈', value: project.openCount || 0 },
    { name: '클릭', value: project.clickCount || 0 },
    { name: '제출', value: project.submitCount || 0 },
  ];

  const departmentData = [
    { name: '영업부', value: 35 },
    { name: '개발부', value: 25 },
    { name: '인사부', value: 20 },
    { name: '기타', value: 20 },
  ];
  const handleStartProject = () => {
    if (project.status !== "예약") return;
    if (!confirm(`"${project.name}" 프로젝트를 지금 시작하시겠습니까?`)) return;
    startProjectMutation.mutate(project);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">{project.name}</h1>
            <Badge className={statusConfig[project.status]?.className}>
              {project.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{project.description || '프로젝트 설명'}</p>
        </div>
        <div className="flex items-center gap-2">
          {project.status === "예약" ? (
            <Button
              variant="outline"
              onClick={handleStartProject}
              disabled={startProjectMutation.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              {startProjectMutation.isPending ? "시작 중" : "지금 시작"}
            </Button>
          ) : null}
          <Button
            data-testid="button-generate-report"
            onClick={handleGenerateReport}
            disabled={isReportGenerating}
          >
            <FileText className="w-4 h-4 mr-2" />
            {isReportGenerating ? "생성 중..." : "보고서 생성"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="발송 수"
          value={project.targetCount?.toLocaleString() || '0'}
          icon={Mail}
        />
        <StatCard
          title="오픈률"
          value={`${openRate}%`}
          icon={Eye}
          description={`${project.openCount || 0}명 열람`}
        />
        <StatCard
          title="클릭률"
          value={`${clickRate}%`}
          icon={MousePointer}
          description={`${project.clickCount || 0}명 클릭`}
        />
        <StatCard
          title="제출률"
          value={`${submitRate}%`}
          icon={FileText}
          description={`${project.submitCount || 0}명 제출`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">훈련 진행 추세</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                cursor={false}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }} 
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">부서별 분포</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">대상자 상세</h2>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>소속</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isActionLogsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : actionLogItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    대상자가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                actionLogItems.map((item) => (
                  <TableRow key={item.projectTargetId}>
                    <TableCell className="font-medium">
                      <SafeText value={item.name} fallback="-" />
                    </TableCell>
                    <TableCell>
                      <SafeText value={item.email} fallback="-" />
                    </TableCell>
                    <TableCell>
                      <SafeText value={item.department ?? ""} fallback="-" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(item)}
                        data-testid={`button-view-log-${item.targetId}`}
                      >
                        상세 로그
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">이벤트 타임라인</h2>
        <div className="space-y-4">
          {isActionLogsLoading ? (
            <div className="text-sm text-muted-foreground">로딩 중...</div>
          ) : timelineItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">이벤트가 없습니다.</div>
          ) : (
            timelineItems.map((event, index) => (
              <div key={`${event.type}-${event.at}-${index}`} className="flex items-start gap-4 pb-4 border-b last:border-0">
                <div className="p-2 rounded-md bg-primary/10">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{event.targetName} - {event.label}</p>
                  <p className="text-sm text-muted-foreground">{formatEventTime(event.at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>상세 로그</DialogTitle>
            <DialogDescription>대상자별 이벤트 타임라인</DialogDescription>
          </DialogHeader>
          {selectedLog ? (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  <SafeText value={selectedLog.name} fallback="-" />
                </p>
                <p className="text-muted-foreground">
                  <SafeText value={selectedLog.email} fallback="-" />
                </p>
              </div>
              <div className="space-y-3">
                {selectedLog.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">이벤트가 없습니다.</p>
                ) : (
                  selectedLog.events.map((event, index) => (
                    <div
                      key={`${selectedLog.projectTargetId}-${event.type}-${index}`}
                      className="flex items-start gap-3 pb-3 border-b last:border-0"
                    >
                      <div className="p-2 rounded-md bg-primary/10">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{event.label}</p>
                        <p className="text-sm text-muted-foreground">{formatEventTime(event.at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
