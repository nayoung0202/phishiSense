"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SmtpConfigForm, createEmptySmtpConfig, type SmtpConfigFormHandle } from "@/components/admin/SmtpConfigForm";
import { SmtpTestPanel } from "@/components/admin/SmtpTestPanel";
import { getSmtpConfig, testSmtpConfig, updateSmtpConfig } from "@/lib/api";
import type { SmtpConfigResponse, TestSmtpConfigPayload, UpdateSmtpConfigPayload } from "@/types/smtp";
import { useToast } from "@/hooks/use-toast";

export type SmtpConfigDetailProps = {
  tenantId: string;
  mode: "create" | "edit";
  title: string;
  description?: string;
  onBack?: () => void;
  onSaveSuccess?: () => void;
};

export function SmtpConfigDetail({ tenantId, mode, title, description, onBack, onSaveSuccess }: SmtpConfigDetailProps) {
  const { toast } = useToast();
  const [formDirty, setFormDirty] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [saveAndTestPending, setSaveAndTestPending] = useState(false);
  const formRef = useRef<SmtpConfigFormHandle>(null);
  const queryClient = useQueryClient();

  const shouldFetch = mode === "edit" && Boolean(tenantId);
  const {
    data: configData,
    error: fetchError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["smtp-config", tenantId],
    queryFn: () => getSmtpConfig(tenantId),
    enabled: shouldFetch,
  });

  const refreshConfig = useCallback(() => {
    if (!tenantId) return;
    void refetch();
  }, [tenantId, refetch]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSmtpConfigPayload) => updateSmtpConfig(tenantId, payload),
    onSuccess: () => {
      toast({ title: "SMTP 설정을 저장했습니다." });
      refreshConfig();
      void queryClient.invalidateQueries({ queryKey: ["smtp-configs"] });
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "알 수 없는 오류입니다.";
      toast({ title: "저장에 실패했습니다.", description: message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: (payload: TestSmtpConfigPayload) => testSmtpConfig(tenantId, payload),
    onSuccess: (response) => {
      toast({
        title: "테스트 발송을 요청했습니다.",
        description: response?.message || "서버 응답을 확인하세요.",
      });
      refreshConfig();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "알 수 없는 오류입니다.";
      toast({ title: "테스트 발송 실패", description: message, variant: "destructive" });
    },
  });

  const handleSave = useCallback(
    (payload: UpdateSmtpConfigPayload) => updateMutation.mutateAsync(payload),
    [updateMutation],
  );

  const handleTest = useCallback(
    async (payload: TestSmtpConfigPayload) => {
      await testMutation.mutateAsync(payload);
    },
    [testMutation],
  );

  const fetchErrorMessage = useMemo(() => {
    if (!fetchError) return null;
    if (fetchError instanceof Error) return fetchError.message;
    return "SMTP 설정을 불러오지 못했습니다.";
  }, [fetchError]);

  const testDisabledReason = useMemo(() => {
    if (mode === "create") {
      return "등록을 완료한 뒤 테스트하세요.";
    }
    if (!configData) {
      return "설정을 불러오는 중입니다.";
    }
    if (!configData.hasPassword) {
      return "SMTP 비밀번호를 저장한 뒤 테스트할 수 있습니다.";
    }
    if (formDirty) {
      return "변경 사항을 저장한 뒤 테스트하세요.";
    }
    if (configData.port !== 465 && configData.port !== 587) {
      return "테스트 발송은 465 또는 587 포트에서만 지원됩니다.";
    }
    return undefined;
  }, [configData, formDirty, mode]);

  const canTest = Boolean(!testDisabledReason);

  const handleRefreshClick = useCallback(() => {
    setFormResetKey((prev) => prev + 1);
    refreshConfig();
  }, [refreshConfig]);

  const initialFormData = useMemo<SmtpConfigResponse | null>(() => {
    if (mode === "create") {
      return createEmptySmtpConfig(tenantId) as SmtpConfigResponse;
    }
    return (configData as SmtpConfigResponse | undefined) ?? null;
  }, [configData, mode, tenantId]);

  const handleSaveThenTest = useCallback(
    async (payload: TestSmtpConfigPayload) => {
      if (!formRef.current) return;
      setSaveAndTestPending(true);
      try {
        await formRef.current.submit();
        await testMutation.mutateAsync(payload);
      } catch (error) {
        // 에러는 각 핸들러에서 처리 (토스트 등)
      } finally {
        setSaveAndTestPending(false);
      }
    },
    [testMutation],
  );

  const testPanelData = mode === "edit" ? (configData ?? null) : null;

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              목록으로
            </Button>
          )}
          <Button variant="outline" onClick={handleRefreshClick} disabled={!tenantId || isFetching}>
            <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
          </Button>
        </div>
      </div>

      {mode === "edit" && fetchErrorMessage && (
        <Alert variant="destructive">
          <AlertTitle>설정 불러오기 실패</AlertTitle>
          <AlertDescription>{fetchErrorMessage.slice(0, 400)}</AlertDescription>
        </Alert>
      )}

      <SmtpConfigForm
        ref={formRef}
        key={`${tenantId}-${mode}-${formResetKey}`}
        mode={mode}
        tenantId={tenantId}
        initialData={initialFormData}
        onSubmit={handleSave}
        isSubmitting={updateMutation.isPending}
        disabled={mode === "create" ? updateMutation.isPending : !configData || updateMutation.isPending}
        onDirtyChange={setFormDirty}
      />

      <SmtpTestPanel
        key={`test-${tenantId}-${mode}-${formResetKey}`}
        onSubmit={handleTest}
        isTesting={testMutation.isPending}
        disabled={!canTest || testMutation.isPending || updateMutation.isPending || saveAndTestPending}
        canSaveAndTest={formDirty && mode === "edit"}
        onSaveAndTest={formDirty ? handleSaveThenTest : undefined}
        saveAndTestPending={saveAndTestPending}
        disabledReason={testDisabledReason}
        allowedDomains={testPanelData?.allowedRecipientDomains || null}
        lastTestedAt={testPanelData?.lastTestedAt}
        lastTestStatus={testPanelData?.lastTestStatus}
        lastTestError={testPanelData?.lastTestError}
      />
    </div>
  );
}
