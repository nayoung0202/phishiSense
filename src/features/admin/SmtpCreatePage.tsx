"use client";

import { useRouter } from "next/navigation";
import { useAutoTenantId } from "@/lib/tenant";
import { SmtpConfigDetail } from "@/features/admin/SmtpConfigDetail";

export default function SmtpCreatePage() {
  const tenantId = useAutoTenantId();
  const router = useRouter();

  return (
    <SmtpConfigDetail
      tenantId={tenantId}
      mode="create"
      title="SMTP 등록"
      description=""
      onBack={() => router.push("/admin/smtp")}
      onSaveSuccess={() => router.push("/admin/smtp")}
    />
  );
}
