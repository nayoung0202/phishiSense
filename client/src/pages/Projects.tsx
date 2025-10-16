import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { type Project } from "@shared/schema";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

const statusConfig: Record<string, { className: string }> = {
  "예약": { className: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
  "진행중": { className: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" },
  "완료": { className: "bg-green-500/20 text-green-400 hover:bg-green-500/30" },
};

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(filteredProjects.map(p => p.id));
    } else {
      setSelectedProjects([]);
    }
  };

  const handleSelectProject = (projectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects([...selectedProjects, projectId]);
    } else {
      setSelectedProjects(selectedProjects.filter(id => id !== projectId));
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  const calculateRate = (count: number | null, total: number | null) => {
    if (!total || !count) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="p-6 space-y-6">
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
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="프로젝트명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="예약">예약</SelectItem>
              <SelectItem value="진행중">진행중</SelectItem>
              <SelectItem value="완료">완료</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedProjects.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedProjects.length}개 선택됨
            </span>
            <Button variant="outline" size="sm" data-testid="button-compare-reports">
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
                    checked={selectedProjects.length === filteredProjects.length && filteredProjects.length > 0}
                    onCheckedChange={handleSelectAll}
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
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    프로젝트가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={(checked) => handleSelectProject(project.id, checked as boolean)}
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
