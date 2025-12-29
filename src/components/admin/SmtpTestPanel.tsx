import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MailCheck, MailWarning } from "lucide-react";
import type { SmtpConfigResponse, TestSmtpConfigPayload } from "@/types/smtp";

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Props = {
  onSubmit: (payload: TestSmtpConfigPayload) => Promise<void> | void;
  isTesting?: boolean;
  disabled?: boolean;
  allowedDomains?: string[] | null;
  lastTestedAt?: SmtpConfigResponse["lastTestedAt"];
  lastTestStatus?: SmtpConfigResponse["lastTestStatus"];
  lastTestError?: SmtpConfigResponse["lastTestError"];
  disabledReason?: string;
};

export function SmtpTestPanel({
  onSubmit,
  isTesting,
  disabled,
  allowedDomains,
  lastTestedAt,
  lastTestStatus,
  lastTestError,
  disabledReason,
}: Props) {
  const [recipient, setRecipient] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailValue = recipient.trim();
  const isEmailValid = emailRegex.test(emailValue);

  const domainHint = useMemo(() => {
    if (!allowedDomains || allowedDomains.length === 0) return "허용된 도메인 제한 없음";
    return `허용 도메인: ${allowedDomains.join(", ")}`;
  }, [allowedDomains]);

  const badge = useMemo(() => {
    if (lastTestStatus === "success") {
      return <Badge className="gap-1 bg-emerald-100 text-emerald-700"><MailCheck className="w-4 h-4" />성공</Badge>;
    }
    if (lastTestStatus === "failure") {
      return <Badge className="gap-1 bg-red-100 text-red-700"><MailWarning className="w-4 h-4" />실패</Badge>;
    }
    return <Badge variant="outline">미실행</Badge>;
  }, [lastTestStatus]);

  const formattedDate = lastTestedAt ? format(new Date(lastTestedAt), "yyyy-MM-dd HH:mm:ss") : "-";
  const visibleError =
    errorMessage ?? (lastTestStatus === "failure" ? lastTestError ?? null : null);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (disabled || !isEmailValid) return;
      setErrorMessage(null);
      try {
        await onSubmit({ testRecipientEmail: emailValue });
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        }
      }
    },
    [disabled, isEmailValid, onSubmit, emailValue],
  );

  useEffect(() => {
    if (disabled) {
      setErrorMessage(null);
    }
  }, [disabled]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMTP 테스트 발송</CardTitle>
        <CardDescription>허용된 도메인으로 테스트 메일을 전송해 연결 상태를 확인합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="smtp-test-email">테스트 수신 이메일 *</Label>
            <Input
              id="smtp-test-email"
              type="email"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="user@example.com"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              허용된 도메인만 사용할 수 있습니다. (예: user@example.com) / {domainHint}
            </p>
            {!isEmailValid && recipient && <p className="text-sm text-destructive">올바른 이메일을 입력하세요.</p>}
            {disabledReason && (
              <p className="text-xs text-amber-600 mt-1">{disabledReason}</p>
            )}
          </div>

          {visibleError && (
            <Alert variant="destructive">
              <AlertTitle>테스트 실패</AlertTitle>
              <AlertDescription>{visibleError.slice(0, 400)}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 rounded-md border p-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">최근 테스트 상태</span>
                <span className="flex items-center gap-2">{badge}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">최근 실행 시각</span>
                <span>{formattedDate}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">최근 오류 메시지</p>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {visibleError ? visibleError.slice(0, 400) : "-"}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Button type="submit" disabled={disabled || !isEmailValid || !!isTesting}>
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "테스트 발송"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
