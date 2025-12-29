"use client";

import { useRouter } from "next/navigation";
import { SmtpConfigDetail } from "@/features/admin/SmtpConfigDetail";

export default function SmtpEditPage({ tenantId }: { tenantId: string }) {
  const router = useRouter();

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
      onBack={() => router.push("/admin/smtp")}
    />
  );
}
