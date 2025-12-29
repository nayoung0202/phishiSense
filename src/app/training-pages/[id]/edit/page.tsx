import TrainingPageEdit from "@/features/TrainingPageEdit";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TrainingPageEditPage({ params }: Props) {
  const { id } = await params;

  return <TrainingPageEdit trainingPageId={id} />;
}
