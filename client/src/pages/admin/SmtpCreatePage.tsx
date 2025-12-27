import { useMemo } from "react";
import { useLocation } from "wouter";
import { createNewTenantId } from "@/lib/tenant";
import { SmtpConfigDetail } from "@/pages/admin/SmtpConfigDetail";

export default function SmtpCreatePage() {
  const tenantId = useMemo(() => createNewTenantId(), []);
  const [, navigate] = useLocation();

  return (
    <SmtpConfigDetail
      tenantId={tenantId}
      mode="create"
      title="SMTP 등록"
      description=""
      onBack={() => navigate("/admin/smtp")}
      onSaveSuccess={() => navigate("/admin/smtp")}
    />
  );
}
