import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SmtpConfigForm } from "@/components/admin/SmtpConfigForm";
import { SmtpTestPanel } from "@/components/admin/SmtpTestPanel";
import { getSmtpConfig, testSmtpConfig, updateSmtpConfig } from "@/lib/api";
import type { SmtpConfigResponse, TestSmtpConfigPayload, UpdateSmtpConfigPayload } from "@/types/smtp";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

const defaultTenantFromEnv = import.meta.env.VITE_DEFAULT_TENANT_ID;
const DEFAULT_TENANT_ID =
  defaultTenantFromEnv && defaultTenantFromEnv.trim().length > 0
    ? defaultTenantFromEnv.trim()
    : "demo-tenant";

const resolveTenantId = () => {
  if (typeof window === "undefined") {
    return DEFAULT_TENANT_ID;
  }
  const stored = window.localStorage.getItem("currentTenantId");
  const trimmedStored = stored?.trim();
  if (trimmedStored) return trimmedStored;
  return DEFAULT_TENANT_ID;
};

export default function SmtpConfigPage() {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string>(() => resolveTenantId());

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTenantId(resolveTenantId());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "currentTenantId") {
        setTenantId(resolveTenantId());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const {
    data: configData,
    error: fetchError,
    isFetching,
    refetch,
  } = useQuery<SmtpConfigResponse>({
    queryKey: ["smtp-config", tenantId],
    queryFn: () => getSmtpConfig(tenantId),
    enabled: Boolean(tenantId),
    staleTime: 0,
    refetchOnMount: false,
  });

  const refreshConfig = useCallback(() => {
    if (!tenantId) return;
    void refetch();
  }, [tenantId, refetch]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateSmtpConfigPayload) => {
      if (!tenantId) throw new Error("테넌트 정보를 확인할 수 없습니다.");
      return updateSmtpConfig(tenantId, payload);
    },
    onSuccess: () => {
      toast({ title: "SMTP 설정을 저장했습니다." });
      refreshConfig();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "알 수 없는 오류입니다.";
      toast({ title: "저장에 실패했습니다.", description: message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: (payload: TestSmtpConfigPayload) => {
      if (!tenantId) throw new Error("테넌트 정보를 확인할 수 없습니다.");
      return testSmtpConfig(tenantId, payload);
    },
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

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">SMTP 관리</h1>
          <p className="text-sm text-muted-foreground">관리자 전용 SMTP 설정과 테스트 페이지입니다.</p>
          <Badge variant="secondary" className="text-xs font-normal">
            현재 테넌트: {tenantId}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={refreshConfig} disabled={!tenantId || isFetching}>
          <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
        </Button>
      </div>

      {fetchErrorMessage && (
        <Alert variant="destructive">
          <AlertTitle>설정 불러오기 실패</AlertTitle>
          <AlertDescription>{fetchErrorMessage.slice(0, 400)}</AlertDescription>
        </Alert>
      )}

      <SmtpConfigForm
        config={configData}
        onSubmit={handleSave}
        isSubmitting={updateMutation.isPending}
        disabled={!configData || updateMutation.isPending}
      />

      <SmtpTestPanel
        onSubmit={handleTest}
        isTesting={testMutation.isPending}
        disabled={!configData}
        allowedDomains={configData?.allowedRecipientDomains || null}
        lastTestedAt={configData?.lastTestedAt}
        lastTestStatus={configData?.lastTestStatus}
        lastTestError={configData?.lastTestError}
      />
    </div>
  );
}
