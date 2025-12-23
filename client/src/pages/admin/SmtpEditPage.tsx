import { useLocation, useParams } from "wouter";
import { SmtpConfigDetail } from "@/pages/admin/SmtpConfigDetail";

export default function SmtpEditPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [, navigate] = useLocation();

  if (!tenantId) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <p className="text-sm text-destructive">테넌트 ID가 제공되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <SmtpConfigDetail
      tenantId={tenantId}
      mode="edit"
      title="SMTP 설정 수정"
      description=""
      onBack={() => navigate("/admin/smtp")}
    />
  );
}
