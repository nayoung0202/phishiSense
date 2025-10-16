import { StatCard } from "@/components/StatCard";
import { ProjectCard } from "@/components/ProjectCard";
import { TemplateCard } from "@/components/TemplateCard";
import { Button } from "@/components/ui/button";
import { Plus, Users, BarChart3, Shield, TrendingUp } from "lucide-react";
import { Link } from "wouter";

// todo: remove mock functionality
const mockProjects = [
  {
    id: "1",
    name: "2024 Q1 전직원 피싱 훈련",
    startDate: "2024.01.15",
    endDate: "2024.01.31",
    status: "완료" as const,
    openRate: 68,
    clickRate: 23,
  },
  {
    id: "2",
    name: "신입사원 대상 보안 교육",
    startDate: "2024.02.01",
    endDate: "2024.02.28",
    status: "진행중" as const,
    openRate: 45,
    clickRate: 12,
  },
  {
    id: "3",
    name: "경영진 타겟 스피어피싱 훈련",
    startDate: "2024.03.01",
    endDate: "2024.03.15",
    status: "예약" as const,
    openRate: 0,
    clickRate: 0,
  },
];

const mockTemplates = [
  {
    id: "1",
    title: "배송 알림 템플릿",
    subject: "[긴급] 배송 주소 확인 필요",
    lastModified: "2시간 전",
  },
  {
    id: "2",
    title: "계정 보안 알림",
    subject: "보안 위협 감지 - 즉시 확인 요망",
    lastModified: "1일 전",
  },
  {
    id: "3",
    title: "업무 협조 요청",
    subject: "Re: 긴급 문서 검토 요청",
    lastModified: "3일 전",
  },
];

export default function Dashboard() {
  const handleNewProject = () => {
    console.log('New project creation triggered');
  };

  const handleAddTemplate = () => {
    console.log('Add template triggered');
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">대시보드</h1>
          <p className="text-muted-foreground">악성메일 모의 훈련 현황을 한눈에 확인하세요</p>
        </div>
        <Button onClick={handleNewProject} data-testid="button-new-project">
          <Plus className="w-4 h-4 mr-2" />
          새 프로젝트 생성
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="전체 훈련 참여자"
          value="1,247"
          icon={Users}
          description="누적 참여자 수"
        />
        <StatCard
          title="평균 오픈률"
          value="52.3%"
          icon={BarChart3}
          description="지난 30일 기준"
        />
        <StatCard
          title="평균 클릭률"
          value="18.7%"
          icon={TrendingUp}
          description="지난 30일 기준"
        />
        <StatCard
          title="개인정보 입력률"
          value="6.2%"
          icon={Shield}
          description="보안 주의 필요"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">최근 프로젝트</h2>
          <Link href="/projects">
            <Button variant="ghost" size="sm" data-testid="button-view-all-projects">
              더보기
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {mockProjects.map((project) => (
            <ProjectCard key={project.id} {...project} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">템플릿 바로가기</h2>
          <Button onClick={handleAddTemplate} variant="outline" size="sm" data-testid="button-add-template">
            <Plus className="w-4 h-4 mr-2" />
            템플릿 추가
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockTemplates.map((template) => (
            <TemplateCard key={template.id} {...template} />
          ))}
        </div>
      </div>
    </div>
  );
}
