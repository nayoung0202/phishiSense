import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, FileText, Trash2, Copy } from "lucide-react";
import { Link } from "wouter";
import { type Project } from "@shared/schema";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
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

function calculateRate(count: number | null, total: number | null): number {
  if (!total || !count) return 0;
  return Math.round((count / total) * 100);
}

const statusConfig: Record<string, { className: string }> = {
  "예약": { className: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
  "진행중": { className: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" },
  "완료": { className: "bg-green-500/20 text-green-400 hover:bg-green-500/30" },
};

type StatusFilter = "all" | "예약" | "진행중" | "완료";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "예약", label: "예약" },
  { value: "진행중", label: "진행중" },
  { value: "완료", label: "완료" },
];

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const copyMutation = useMutation<Project[], Error, string[]>({
    mutationFn: async (ids) => {
      const res = await apiRequest("POST", "/api/projects/copy", { ids });
      const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("application/json")) {
        const fallback = await res.text();
        const message = fallback.trim().startsWith("<")
          ? "서버가 올바른 JSON 응답을 반환하지 않았습니다."
          : fallback;
        throw new Error(message || "프로젝트 복제 응답을 파싱할 수 없습니다.");
      }
      return (await res.json()) as Project[];
    },
    onSuccess: (copiedProjects) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [project.name, project.department ?? ""].some((field) =>
        field.toLowerCase().includes(normalizedSearch),
      );
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedProjectDetails = useMemo(
    () =>
      projects.filter((project) => selectedProjects.includes(project.id)),
    [projects, selectedProjects],
  );

  const compareChartData = useMemo(() => {
    return selectedProjectDetails.map((project) => {
      const period = `${format(new Date(project.startDate), "yyyy-MM-dd")} ~ ${format(
        new Date(project.endDate),
        "yyyy-MM-dd",
      )}`;

      return {
        id: project.id,
        name: project.name,
        department: project.department ?? "-",
        status: project.status,
        period,
        발송수: project.targetCount ?? 0,
        오픈률: calculateRate(project.openCount, project.targetCount),
        클릭률: calculateRate(project.clickCount, project.targetCount),
        제출률: calculateRate(project.submitCount, project.targetCount),
        오픈수: project.openCount ?? 0,
        클릭수: project.clickCount ?? 0,
        제출수: project.submitCount ?? 0,
      };
    });
  }, [selectedProjectDetails]);

  const isAllSelected =
    filteredProjects.length > 0 &&
    filteredProjects.every((project) => selectedProjects.includes(project.id));

  const selectAllState: boolean | "indeterminate" =
    selectedProjects.length === 0
      ? false
      : isAllSelected
      ? true
      : "indeterminate";

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(filteredProjects.map((project) => project.id));
      return;
    }
    setSelectedProjects([]);
  };

  const handleSelectProject = (projectId: string, checked: boolean) => {
    setSelectedProjects((prev) => {
      if (checked) {
        if (prev.includes(projectId)) {
          return prev;
        }
        return [...prev, projectId];
      }
      return prev.filter((id) => id !== projectId);
    });
  };

  const handleCopyProjects = () => {
    if (selectedProjects.length === 0) return;
    copyMutation.mutate(selectedProjects);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-w-4xl" data-testid="dialog-compare-report">
          <DialogHeader>
            <DialogTitle>비교 보고서 미리보기</DialogTitle>
            <DialogDescription>
              선택된 프로젝트의 주요 지표를 나란히 비교합니다. 실제 보고서 생성 전에 확인하세요.
            </DialogDescription>
          </DialogHeader>
          {selectedProjectDetails.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              비교할 프로젝트를 다시 선택해주세요.
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                {selectedProjectDetails.length}개 프로젝트 비교 중
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {compareChartData.map((project) => (
                  <div
                    key={`compare-summary-${project.id}`}
                    className="rounded-md border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium leading-tight">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.period}</p>
                      </div>
                      <Badge className={statusConfig[project.status]?.className || ""}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="bg-transparent">
                        {project.department}
                      </Badge>
                      <span>발송 {project.발송수.toLocaleString()}명</span>
                      <span>오픈 {project.오픈수.toLocaleString()}명</span>
                      <span>클릭 {project.클릭수.toLocaleString()}명</span>
                      <span>제출 {project.제출수.toLocaleString()}명</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-[340px] rounded-md border bg-muted/30 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={compareChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      yAxisId="count"
                      stroke="hsl(var(--muted-foreground))"
                      width={60}
                    />
                    <YAxis
                      yAxisId="rate"
                      orientation="right"
                      domain={[0, 100]}
                      stroke="hsl(var(--muted-foreground))"
                      width={60}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                      formatter={(value, name, payload) => {
                        const label = String(name);
                        if (label.endsWith("률")) {
                          return [`${value as number}%`, label];
                        }
                        return [`${(value as number).toLocaleString()}명`, label];
                      }}
                      labelFormatter={(_, payload) => {
                        const meta = payload?.[0]?.payload;
                        return `${meta?.name ?? ""} · ${meta?.period ?? ""}`;
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
                      type="monotone"
                      dataKey="오픈률"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="rate"
                      type="monotone"
                      dataKey="클릭률"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="rate"
                      type="monotone"
                      dataKey="제출률"
                      stroke="hsl(var(--chart-4))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">프로젝트 관리</h1>
          <p className="text-muted-foreground">훈련 프로젝트를 관리하고 진행 상황을 확인하세요</p>
        </div>
        <Link href="/projects/new">
          <Button data-testid="button-new-project">
            <Plus className="w-4 h-4 mr-2" />
            새 프로젝트
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="프로젝트명 또는 부서명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <RadioGroup
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            className="flex flex-wrap gap-4"
          >
            {statusOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem
                  value={option.value}
                  id={`status-filter-${option.value}`}
                  data-testid={`radio-status-${option.value}`}
                />
                <Label htmlFor={`status-filter-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {selectedProjects.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedProjects.length}개 선택됨
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyProjects}
              disabled={copyMutation.isPending}
              data-testid="button-copy-projects"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copyMutation.isPending ? "복사 중..." : "프로젝트 복사"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCompareOpen(true)}
              disabled={selectedProjects.length < 2}
              data-testid="button-compare-reports"
            >
              <FileText className="w-4 h-4 mr-2" />
              비교 보고서 생성
            </Button>
          </div>
        )}

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAllState}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    프로젝트가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={(checked) => handleSelectProject(project.id, Boolean(checked))}
                        data-testid={`checkbox-project-${project.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(project.startDate), 'yyyy-MM-dd')} ~ {format(new Date(project.endDate), 'yyyy-MM-dd')}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[project.status]?.className || ""}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{project.targetCount?.toLocaleString() || 0}명</TableCell>
                    <TableCell className="text-primary font-semibold">
                      {calculateRate(project.openCount, project.targetCount)}%
                    </TableCell>
                    <TableCell className="text-primary font-semibold">
                      {calculateRate(project.clickCount, project.targetCount)}%
                    </TableCell>
                    <TableCell className="text-primary font-semibold">
                      {calculateRate(project.submitCount, project.targetCount)}%
                    </TableCell>
                    <TableCell>{project.department || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-${project.id}`}>
                            상세
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-report-${project.id}`}
                        >
                          보고서
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(project.id)}
                          data-testid={`button-delete-${project.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
