import SmtpEditPage from "@/features/admin/SmtpEditPage";

type Props = {
  params: Promise<{
    smtpAccountId: string;
  }>;
};

export default async function AdminSmtpEditPage({ params }: Props) {
  const { smtpAccountId } = await params;

  return <SmtpEditPage smtpAccountId={smtpAccountId} />;
}
