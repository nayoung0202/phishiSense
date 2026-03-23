"use client";

import { useRouter } from "next/navigation";
import { SmtpConfigDetail } from "@/features/admin/SmtpConfigDetail";

export default function SmtpEditPage({ smtpAccountId }: { smtpAccountId: string }) {
  const router = useRouter();

  if (!smtpAccountId) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <p className="text-sm text-destructive">SMTP 계정 ID가 제공되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <SmtpConfigDetail
      smtpAccountId={smtpAccountId}
      mode="edit"
      title="SMTP 설정 수정"
      description=""
      onBack={() => router.push("/admin/smtp")}
    />
  );
}
