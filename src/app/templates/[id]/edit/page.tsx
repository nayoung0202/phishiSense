import TemplateEdit from "@/features/TemplateEdit";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TemplateEditPage({ params }: Props) {
  const { id } = await params;

  return <TemplateEdit templateId={id} />;
}
