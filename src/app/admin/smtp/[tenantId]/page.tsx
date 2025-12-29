import SmtpEditPage from "@/features/admin/SmtpEditPage";

type Props = {
  params: Promise<{
    tenantId: string;
  }>;
};

export default async function AdminSmtpEditPage({ params }: Props) {
  const { tenantId } = await params;

  return <SmtpEditPage tenantId={tenantId} />;
}
