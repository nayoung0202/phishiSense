import { ProjectCard } from '../ProjectCard';

export default function ProjectCardExample() {
  return (
    <div className="p-6 w-full max-w-md">
      <ProjectCard
        id="1"
        name="2024 Q1 전직원 피싱 훈련"
        startDate="2024.01.15"
        endDate="2024.01.31"
        status="완료"
        openRate={68}
        clickRate={23}
      />
    </div>
  );
}
