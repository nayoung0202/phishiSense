import ProjectCreate from "@/features/ProjectCreate";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectEditPage({ params }: Props) {
  const { id } = await params;
  return <ProjectCreate mode="edit" projectId={id} />;
}
