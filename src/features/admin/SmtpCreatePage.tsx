"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { createNewTenantId } from "@/lib/tenant";
import { SmtpConfigDetail } from "@/features/admin/SmtpConfigDetail";

export default function SmtpCreatePage() {
  const tenantId = useMemo(() => createNewTenantId(), []);
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
