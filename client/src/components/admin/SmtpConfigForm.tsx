import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { SmtpConfigResponse, UpdateSmtpConfigPayload } from "@/types/smtp";
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

type PortMode = "25" | "465" | "587" | "custom";
type SecurityPreset = "SMTP" | "SMTPS" | "STARTTLS";

export const defaultFormState: FormState = {
  host: "",
  port: 587,
  securityMode: "STARTTLS",
  username: "",
  fromEmail: "alerts@example.com",
  fromName: "PhishSense",
  replyTo: "alerts@example.com",
  tlsVerify: true,
  rateLimitPerMin: 60,
  allowedRecipientDomains: [],
  isActive: true,
};

export function createEmptySmtpConfig(tenantId: string): SmtpConfigResponse {
  return {
    tenantId,
    host: "",
    port: 587,
    securityMode: "STARTTLS",
    username: "",
    fromEmail: "alerts@example.com",
    fromName: "PhishSense",
    replyTo: "alerts@example.com",
    tlsVerify: true,
    rateLimitPerMin: 60,
    allowedRecipientDomains: [],
    isActive: true,
    lastTestedAt: null,
    lastTestStatus: null,
    lastTestError: null,
    hasPassword: false,
  };
}

const inferPortMode = (port: number): PortMode => {
  if (port === 25) return "25";
  if (port === 465) return "465";
  if (port === 587) return "587";
  return "custom";
};

const snapshotFormState = (state: FormState) =>
  JSON.stringify({
    ...state,
    allowedRecipientDomains: [...state.allowedRecipientDomains],
  });

type SmtpConfigFormProps = {
  mode: "create" | "edit";
  tenantId: string;
  initialData?: SmtpConfigResponse | null;
  onSubmit: (payload: UpdateSmtpConfigPayload) => Promise<void> | void;
  isSubmitting?: boolean;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

export type SmtpConfigFormHandle = {
  submit: () => Promise<void>;
};

export const SmtpConfigForm = forwardRef<SmtpConfigFormHandle, SmtpConfigFormProps>(function SmtpConfigForm(
  { mode, tenantId, initialData, onSubmit, isSubmitting, disabled, onDirtyChange },
  ref,
) {
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [passwordInput, setPasswordInput] = useState("");
  const [domainDraft, setDomainDraft] = useState("");
  const [registeredDomain, setRegisteredDomain] = useState("");
  const [portMode, setPortMode] = useState<PortMode>("587");
  const [customPortInput, setCustomPortInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const snapshotRef = useRef<string | null>(null);
  const [isDirtyState, setIsDirtyState] = useState(false);

  useEffect(() => {
    if (!initialData) {
      setFormState(defaultFormState);
      setPasswordInput("");
      setDomainDraft("");
      setDomainError(null);
      setRegisteredDomain("");
      setPortMode("587");
      setCustomPortInput("");
      snapshotRef.current = snapshotFormState(defaultFormState);
      setIsDirtyState(false);
      onDirtyChange?.(false);
      return;
    }

    const normalizedDomains = (initialData.allowedRecipientDomains || [])
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);
    const initialDomain = normalizedDomains[0] ?? "";
    const nextPortMode = inferPortMode(initialData.port);

    const safePort = Number(initialData.port) || 0;

    const nextState: FormState = {
      host: initialData.host,
      port: safePort > 0 ? safePort : 587,
      securityMode:
        initialData.securityMode === "SMTPS" || initialData.securityMode === "STARTTLS"
          ? initialData.securityMode
          : "NONE",
      username: initialData.username || "",
      fromEmail: initialData.fromEmail,
      fromName: initialData.fromName || "",
      replyTo: initialData.replyTo || "",
      tlsVerify: initialData.tlsVerify,
      rateLimitPerMin: initialData.rateLimitPerMin,
      allowedRecipientDomains: initialDomain ? [initialDomain] : [],
      isActive: initialData.isActive,
    };
    setFormState(nextState);
    setRegisteredDomain(initialDomain);
    setPortMode(nextPortMode);
    setCustomPortInput(nextPortMode === "custom" ? String(initialData.port) : "");
    setPasswordInput("");
    setDomainDraft(initialDomain);
    setDomainError(null);
    snapshotRef.current = snapshotFormState(nextState);
    setIsDirtyState(false);
    onDirtyChange?.(false);
  }, [initialData, onDirtyChange]);

  useEffect(() => {
    if (!snapshotRef.current) return;
    const currentSnapshot = snapshotFormState(formState);
    const dirty = currentSnapshot !== snapshotRef.current || passwordInput.length > 0;
    if (dirty !== isDirtyState) {
      setIsDirtyState(dirty);
      onDirtyChange?.(dirty);
    }
  }, [formState, passwordInput, isDirtyState, onDirtyChange]);

  const handleChange = useCallback(<TKey extends keyof FormState>(key: TKey, value: FormState[TKey]) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const hostValue = (formState.host ?? "").trim();
  const fromEmailValue = (formState.fromEmail ?? "").trim();
  const replyToValue = (formState.replyTo ?? "").trim();

  const isHostFilled = hostValue.length > 0;
  const hostError = !isHostFilled
    ? null
    : !domainRegex.test(hostValue)
      ? "예: smtp.example.com 형태로 입력하세요."
      : null;
  const hostIpWarning = hostValue && ipRegex.test(hostValue) ? "아이피 주소 대신 도메인 사용을 권장합니다." : null;

  const isCustomPort = portMode === "custom";
  const isPortValid = isCustomPort ? formState.port > 0 && formState.port <= 65535 : true;

  const canSubmit =
    !disabled &&
    !isSubmitting &&
    !!initialData &&
    isHostFilled &&
    hostError === null &&
    isPortValid;

  const allowedDomains = formState.allowedRecipientDomains;

  const registerDomain = useCallback(() => {
    const nextValue = domainDraft.trim().toLowerCase();
    if (!nextValue) return;
    if (!domainRegex.test(nextValue)) {
      setDomainError("허용 도메인은 example.com 형태여야 합니다.");
      return;
    }
    setDomainError(null);
    setRegisteredDomain(nextValue);
    setFormState((prev) => ({
      ...prev,
      allowedRecipientDomains: [nextValue],
      fromEmail: `alerts@${nextValue}`,
      replyTo: `alerts@${nextValue}`,
    }));
  }, [domainDraft]);

  const handlePortModeChange = useCallback(
    (value: string) => {
      const nextMode = value as PortMode;
      setPortMode(nextMode);
      if (nextMode === "custom") {
        setCustomPortInput("");
        handleChange("port", 0);
        return;
      }
      const numeric = Number(nextMode);
      handleChange("port", numeric);
      setCustomPortInput("");
    },
    [handleChange],
  );

  const handleCustomPortInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setCustomPortInput(value);
      const numeric = Number(value);
      handleChange("port", Number.isNaN(numeric) ? 0 : numeric);
    },
    [handleChange],
  );

  const handleSecurityPresetChange = useCallback(
    (value: SecurityPreset) => {
      const mode: FormState["securityMode"] =
        value === "SMTPS" ? "SMTPS" : value === "STARTTLS" ? "STARTTLS" : "NONE";
      handleChange("securityMode", mode);
    },
    [handleChange],
  );

  const securityPreset: SecurityPreset = useMemo(() => {
    if (formState.securityMode === "SMTPS") return "SMTPS";
    if (formState.securityMode === "STARTTLS") return "STARTTLS";
    return "SMTP";
  }, [formState.securityMode]);

  const submitForm = useCallback(async () => {
    if (!canSubmit || !initialData) {
      setSubmitError("입력값을 확인하세요.");
      throw new Error("입력값을 확인하세요.");
    }
    setSubmitError(null);
    setDomainError(null);

    const payload: UpdateSmtpConfigPayload = {
      host: hostValue,
      port: formState.port,
      securityMode: formState.securityMode,
      fromEmail: fromEmailValue,
      tlsVerify: formState.tlsVerify,
      rateLimitPerMin: formState.rateLimitPerMin,
      isActive: formState.isActive,
    };

    if (formState.username.trim()) payload.username = formState.username.trim();
    if (formState.fromName.trim()) payload.fromName = formState.fromName.trim();
    if (replyToValue) payload.replyTo = replyToValue;
    if (allowedDomains.length > 0) payload.allowedRecipientDomains = allowedDomains;
    if (passwordInput.length > 0) payload.password = passwordInput;

    try {
      await onSubmit(payload);
      setPasswordInput("");
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      }
      throw error;
    }
  }, [
    allowedDomains,
    canSubmit,
    formState.fromName,
    formState.isActive,
    formState.port,
    formState.rateLimitPerMin,
    formState.replyTo,
    formState.securityMode,
    formState.tlsVerify,
    formState.username,
    fromEmailValue,
    hostValue,
    initialData,
    onSubmit,
    passwordInput,
    replyToValue,
  ]);

  useImperativeHandle(ref, () => ({
    submit: submitForm,
  }));

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await submitForm();
    },
    [submitForm],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMTP 설정</CardTitle>
      </CardHeader>
      <CardContent>
        {!initialData ? (
          <p className="text-sm text-muted-foreground">SMTP 설정을 불러오고 있습니다. 잠시만 기다려주세요.</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-6 rounded-lg border p-4 bg-muted/30">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="domain-register">도메인 명</Label>
                  <Input
                    className="w-full"
                    id="domain-register"
                    value={domainDraft}
                    onChange={(event) => setDomainDraft(event.target.value)}
                    onBlur={registerDomain}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        registerDomain();
                      }
                    }}
                    placeholder="example.com"
                    disabled={disabled}
                  />
                  {domainError && <p className="text-sm text-destructive">{domainError}</p>}
                  {!domainError && registeredDomain && (
                    <p className="text-xs text-muted-foreground">등록된 도메인: {registeredDomain}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP 호스트</Label>
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>포트</Label>
                  <Select value={portMode} onValueChange={handlePortModeChange} disabled={disabled}>
                    <SelectTrigger>
                      <SelectValue placeholder="포트를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 (SMTP)</SelectItem>
                      <SelectItem value="465">465 (SMTPS)</SelectItem>
                      <SelectItem value="587">587 (STARTTLS)</SelectItem>
                      <SelectItem value="custom">직접 입력</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustomPort && (
                    <Input
                      className="mt-2"
                      type="number"
                      min={1}
                      max={65535}
                      value={customPortInput}
                      onChange={handleCustomPortInputChange}
                      placeholder="포트를 입력하세요"
                      disabled={disabled}
                    />
                  )}
                  {isCustomPort && !isPortValid && (
                    <p className="text-sm text-destructive">1~65535 범위의 포트를 입력하세요.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>보안 모드</Label>
                  <Select
                    value={securityPreset}
                    onValueChange={(value) => handleSecurityPresetChange(value as SecurityPreset)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="보안 방식을 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMTP">SMTP</SelectItem>
                      <SelectItem value="SMTPS">SMTPS</SelectItem>
                      <SelectItem value="STARTTLS">STARTTLS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                    placeholder="선택 입력"
                    disabled={disabled}
                  />
                </div>
              </div>
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
});
