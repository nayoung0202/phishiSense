import TargetEdit from "@/features/TargetEdit";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TargetEditPage({ params }: Props) {
  const { id } = await params;

  return <TargetEdit targetId={id} />;
}
