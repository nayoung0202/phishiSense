"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Mail, Eye, MousePointer, FileText, Clock } from "lucide-react";
import { type Project } from "@shared/schema";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { apiRequest } from "@/lib/queryClient";

const statusConfig: Record<string, { className: string }> = {
  "예약": { className: "bg-blue-500/20 text-blue-400" },
  "진행중": { className: "bg-orange-500/20 text-orange-400" },
  "완료": { className: "bg-green-500/20 text-green-400" },
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function ProjectDetail({ projectId }: { projectId: string }) {
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

  // Mock target data
  const mockTargets = [
    { id: '1', name: '김철수', email: 'kim@company.com', department: '영업부', status: '클릭' },
    { id: '2', name: '이영희', email: 'lee@company.com', department: '개발부', status: '열람' },
    { id: '3', name: '박민수', email: 'park@company.com', department: '인사부', status: '제출' },
  ];

  const mockTimeline = [
    { time: '2024-01-15 09:30', user: '김철수', action: '메일 열람' },
    { time: '2024-01-15 10:15', user: '이영희', action: '링크 클릭' },
    { time: '2024-01-15 11:00', user: '박민수', action: '정보 제출' },
  ];

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
        <Button data-testid="button-generate-report">
          <FileText className="w-4 h-4 mr-2" />
          보고서 생성
        </Button>
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
              {mockTargets.map((target) => (
                <TableRow key={target.id}>
                  <TableCell className="font-medium">{target.name}</TableCell>
                  <TableCell>{target.email}</TableCell>
                  <TableCell>{target.department}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{target.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" data-testid={`button-view-log-${target.id}`}>
                      상세 로그
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">이벤트 타임라인</h2>
        <div className="space-y-4">
          {mockTimeline.map((event, index) => (
            <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
              <div className="p-2 rounded-md bg-primary/10">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{event.user} - {event.action}</p>
                <p className="text-sm text-muted-foreground">{event.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
