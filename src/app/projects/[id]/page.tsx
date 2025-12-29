import ProjectDetail from "@/features/ProjectDetail";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;

  return <ProjectDetail projectId={id} />;
}
