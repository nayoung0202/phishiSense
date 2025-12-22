import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, ShieldOff, AlertTriangle, Loader2 } from "lucide-react";
import type { SmtpConfigResponse, UpdateSmtpConfigPayload } from "@/types/smtp";

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const domainRegex = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;
const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;

type FormState = {
  host: string;
  port: number;
  securityMode: SmtpConfigResponse["securityMode"];
  username: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  tlsVerify: boolean;
  rateLimitPerMin: number;
  allowedRecipientDomains: string[];
  isActive: boolean;
};

const defaultFormState: FormState = {
  host: "",
  port: 587,
  securityMode: "STARTTLS",
  username: "",
  fromEmail: "",
  fromName: "",
  replyTo: "",
  tlsVerify: true,
  rateLimitPerMin: 60,
  allowedRecipientDomains: [],
  isActive: true,
};

type SmtpConfigFormProps = {
  config?: SmtpConfigResponse | null;
  onSubmit: (payload: UpdateSmtpConfigPayload) => Promise<void> | void;
  isSubmitting?: boolean;
  disabled?: boolean;
};

export function SmtpConfigForm({ config, onSubmit, isSubmitting, disabled }: SmtpConfigFormProps) {
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [passwordInput, setPasswordInput] = useState("");
  const [domainDraft, setDomainDraft] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) {
      setFormState(defaultFormState);
      setPasswordInput("");
      setDomainDraft("");
      setDomainError(null);
      return;
    }

    setFormState({
      host: config.host,
      port: config.port === 465 || config.port === 587 ? config.port : 587,
      securityMode: config.securityMode,
      username: config.username || "",
      fromEmail: config.fromEmail,
      fromName: config.fromName || "",
      replyTo: config.replyTo || "",
      tlsVerify: config.tlsVerify,
      rateLimitPerMin: config.rateLimitPerMin,
      allowedRecipientDomains: config.allowedRecipientDomains || [],
      isActive: config.isActive,
    });
    setPasswordInput("");
    setDomainDraft("");
    setDomainError(null);
  }, [config]);

  const handleChange = useCallback(<TKey extends keyof FormState>(key: TKey, value: FormState[TKey]) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const forcedSecurityMode = useMemo(() => {
    if (formState.port === 465) return "SMTPS";
    if (formState.port === 587) return "STARTTLS";
    return null;
  }, [formState.port]);

  const activeSecurityMode = forcedSecurityMode ?? formState.securityMode;

  const hostValue = (formState.host ?? "").trim();
  const fromEmailValue = (formState.fromEmail ?? "").trim();

  const hostError = hostValue.length === 0
    ? "호스트를 입력하세요."
    : !domainRegex.test(hostValue)
      ? "예: smtp.example.com 형태로 입력하세요."
      : null;
  const hostIpWarning = hostValue && ipRegex.test(hostValue) ? "아이피 주소 대신 도메인 사용을 권장합니다." : null;

  const fromEmailError = fromEmailValue.length === 0
    ? "발신 이메일을 입력하세요."
    : !emailRegex.test(fromEmailValue)
      ? "올바른 이메일 형식이 아닙니다."
      : null;

  const replyToValue = (formState.replyTo ?? "").trim();
  const replyToError = replyToValue && !emailRegex.test(replyToValue)
    ? "회신 이메일 형식을 확인하세요."
    : null;

  const isPortValid = formState.port === 465 || formState.port === 587;

  const canSubmit =
    !disabled &&
    !isSubmitting &&
    !!config &&
    hostError === null &&
    fromEmailError === null &&
    replyToError === null &&
    isPortValid;

  const allowedDomains = formState.allowedRecipientDomains;

  const addDomainDraft = useCallback(() => {
    const nextValue = domainDraft.trim().toLowerCase();
    if (!nextValue) return;
    if (!domainRegex.test(nextValue)) {
      setDomainError("허용 도메인은 example.com 형태여야 합니다.");
      return;
    }
    setDomainError(null);
    setFormState((prev) => {
      if (prev.allowedRecipientDomains.includes(nextValue)) return prev;
      return {
        ...prev,
        allowedRecipientDomains: [...prev.allowedRecipientDomains, nextValue],
      };
    });
    setDomainDraft("");
  }, [domainDraft]);

  const removeDomain = useCallback((domain: string) => {
    setFormState((prev) => ({
      ...prev,
      allowedRecipientDomains: prev.allowedRecipientDomains.filter((item) => item !== domain),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!canSubmit || !config) return;
      setSubmitError(null);
      setDomainError(null);

      const payload: UpdateSmtpConfigPayload = {
        host: hostValue,
        port: formState.port,
        securityMode: activeSecurityMode,
        fromEmail: fromEmailValue,
        tlsVerify: formState.tlsVerify,
        rateLimitPerMin: formState.rateLimitPerMin,
        isActive: formState.isActive,
      };

      if (formState.username.trim()) payload.username = formState.username.trim();
      if (formState.fromName.trim()) payload.fromName = formState.fromName.trim();
      if (replyToValue) payload.replyTo = replyToValue;
      if (allowedDomains.length > 0) payload.allowedRecipientDomains = allowedDomains;
      if (passwordInput.trim()) payload.password = passwordInput.trim();

      try {
        await onSubmit(payload);
        setPasswordInput("");
      } catch (error) {
        if (error instanceof Error) {
          setSubmitError(error.message);
        }
      }
    },
    [
      canSubmit,
      config,
      formState.port,
      formState.tlsVerify,
      formState.rateLimitPerMin,
      formState.isActive,
      formState.username,
      formState.fromName,
      formState.replyTo,
      allowedDomains,
      passwordInput,
      hostValue,
      fromEmailValue,
      activeSecurityMode,
      onSubmit,
    ],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMTP 설정</CardTitle>
        <CardDescription>필수 항목을 입력 후 저장하면 서버에 즉시 반영됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {!config ? (
          <p className="text-sm text-muted-foreground">SMTP 설정을 불러오고 있습니다. 잠시만 기다려주세요.</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-muted-foreground">비밀번호 상태:</span>
              {config.hasPassword ? (
                <Badge className="gap-1" variant="secondary">
                  <ShieldCheck className="w-4 h-4" /> 등록됨
                </Badge>
              ) : (
                <Badge className="gap-1" variant="destructive">
                  <ShieldOff className="w-4 h-4" /> 미등록
                </Badge>
              )}
              <span className="text-muted-foreground">비밀번호는 저장에 사용된 후 즉시 파기됩니다.</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP 호스트 *</Label>
                <Input
                  id="smtp-host"
                  value={formState.host}
                  onChange={(event) => handleChange("host", event.target.value)}
                  placeholder="smtp.example.com"
                  disabled={disabled}
                />
                {hostError && <p className="text-sm text-destructive">{hostError}</p>}
                {!hostError && hostIpWarning && (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {hostIpWarning}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-port">포트 *</Label>
                <Select
                  value={String(formState.port)}
                  onValueChange={(value) => handleChange("port", Number(value))}
                  disabled={disabled}
                >
                  <SelectTrigger id="smtp-port">
                    <SelectValue placeholder="포트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="465">465 (SMTPS)</SelectItem>
                    <SelectItem value="587">587 (STARTTLS)</SelectItem>
                  </SelectContent>
                </Select>
                {!isPortValid && (
                  <p className="text-sm text-destructive">465 또는 587만 허용됩니다.</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>보안 모드 *</Label>
                <Select
                  value={activeSecurityMode}
                  onValueChange={(value) => handleChange("securityMode", value as FormState["securityMode"])}
                  disabled={disabled || !!forcedSecurityMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="보안 방식을 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMTPS">SMTPS (465)</SelectItem>
                    <SelectItem value="STARTTLS">STARTTLS (587)</SelectItem>
                    <SelectItem value="NONE">암호화 없음</SelectItem>
                  </SelectContent>
                </Select>
                {forcedSecurityMode ? (
                  <p className="text-xs text-muted-foreground">포트 {formState.port} 선택 시 자동으로 {forcedSecurityMode}가 적용됩니다.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">고객사 SMTP 정책에 맞는 보안 모드를 선택하세요.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-username">계정 아이디</Label>
                <Input
                  id="smtp-username"
                  value={formState.username}
                  onChange={(event) => handleChange("username", event.target.value)}
                  placeholder="선택 입력"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-password">비밀번호</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  placeholder="변경할 때만 입력"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">저장 시에만 암호화 채널로 전송되며 화면에 다시 표시되지 않습니다.</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-fromEmail">발신 이메일 *</Label>
                <Input
                  id="smtp-fromEmail"
                  type="email"
                  value={formState.fromEmail}
                  onChange={(event) => handleChange("fromEmail", event.target.value)}
                  placeholder="alerts@example.com"
                  disabled={disabled}
                />
                {fromEmailError && <p className="text-sm text-destructive">{fromEmailError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-fromName">발신 이름</Label>
                <Input
                  id="smtp-fromName"
                  value={formState.fromName}
                  onChange={(event) => handleChange("fromName", event.target.value)}
                  placeholder="PhishSense 알림"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-replyTo">회신 이메일</Label>
                <Input
                  id="smtp-replyTo"
                  type="email"
                  value={formState.replyTo}
                  onChange={(event) => handleChange("replyTo", event.target.value)}
                  placeholder="support@example.com"
                  disabled={disabled}
                />
                {replyToError && <p className="text-sm text-destructive">{replyToError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-rateLimit">분당 발송 제한</Label>
                <Input
                  id="smtp-rateLimit"
                  type="number"
                  min={1}
                  value={formState.rateLimitPerMin}
                  onChange={(event) => handleChange("rateLimitPerMin", Number(event.target.value) || 0)}
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">서버 과부하 방지 기본값 60건/분</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>TLS 인증서 검증</Label>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">서버 인증서 검증</p>
                    <p className="text-xs text-muted-foreground">보안을 위해 기본 활성화 상태를 유지하세요.</p>
                  </div>
                  <Switch
                    checked={formState.tlsVerify}
                    onCheckedChange={(checked) => handleChange("tlsVerify", checked)}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>SMTP 상태</Label>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">활성 여부</p>
                    <p className="text-xs text-muted-foreground">비활성화하면 발송이 중단됩니다.</p>
                  </div>
                  <Switch
                    checked={formState.isActive}
                    onCheckedChange={(checked) => handleChange("isActive", checked)}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>허용 수신 도메인</Label>
              <p className="text-xs text-muted-foreground">콤마 또는 Enter로 도메인을 추가하세요. 비워두면 제한하지 않습니다.</p>
              <div className="flex gap-2">
                <Input
                  value={domainDraft}
                  onChange={(event) => setDomainDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addDomainDraft();
                    }
                    if (event.key === ",") {
                      event.preventDefault();
                      addDomainDraft();
                    }
                  }}
                  placeholder="example.com"
                  disabled={disabled}
                />
                <Button type="button" variant="outline" onClick={addDomainDraft} disabled={disabled}>
                  추가
                </Button>
              </div>
              {domainError && <p className="text-sm text-destructive">{domainError}</p>}
              {allowedDomains.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allowedDomains.map((domain) => (
                    <Badge key={domain} variant="outline" className="gap-1">
                      {domain}
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => removeDomain(domain)}
                        aria-label={`${domain} 삭제`}
                      >
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">등록된 제한이 없습니다.</p>
              )}
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertTitle>저장 실패</AlertTitle>
                <AlertDescription>{submitError.slice(0, 400)}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
