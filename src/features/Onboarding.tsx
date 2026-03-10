"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;
const ENCODED_SLASH_PATTERN = /%2f/i;
const ENCODED_BACKSLASH_PATTERN = /%5c/i;

type PlatformContextResponse = {
  authenticated: boolean;
  status:
    | "ready"
    | "dev_bypass"
    | "tenant_missing"
    | "tenant_selection_required"
    | "entitlement_pending"
    | "entitlement_inactive"
    | "platform_token_missing"
    | "platform_not_configured"
    | "platform_unauthorized"
    | "platform_unavailable";
  hasAccess: boolean;
  onboardingRequired: boolean;
  tenantId: string | null;
  currentTenantId: string | null;
  tenants: Array<{
    tenantId: string;
    name: string;
    role: string;
  }>;
  products: Array<{
    tenantId: string;
    productId: string;
    status: string;
    plan?: string | null;
    seatLimit?: number | null;
    expiresAt?: string | null;
  }>;
  platformProduct?: {
    tenantId: string;
    productId: string;
    status: string;
    plan?: string | null;
    seatLimit?: number | null;
    expiresAt?: string | null;
  } | null;
  localEntitlement?: {
    status: string;
    planCode?: string | null;
    seatLimit?: number | null;
    expiresAt?: string | null;
  } | null;
};

const roleLabelMap: Record<string, string> = {
  OWNER: "소유자",
  ADMIN: "관리자",
  MEMBER: "구성원",
  USER: "사용자",
};

const entitlementStatusLabelMap: Record<string, string> = {
  ACTIVE: "이용 가능",
  SUSPENDED: "이용 일시 중지",
  EXPIRED: "이용 기간 만료",
  PENDING: "확인 중",
};

const fetchPlatformContext = async (): Promise<PlatformContextResponse> => {
  const response = await fetch("/api/auth/platform-context", {
    credentials: "include",
    cache: "no-store",
  });

  const body = (await response.json()) as PlatformContextResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error || "이용 상태를 확인하지 못했습니다.");
  }

  return body;
};

const updateTenantContext = async (tenantId: string): Promise<PlatformContextResponse> => {
  const response = await fetch("/api/auth/session/tenant", {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tenantId }),
  });

  const body = (await response.json()) as PlatformContextResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error || "회사 또는 조직을 선택하지 못했습니다.");
  }

  return body;
};

const statusMessageMap: Record<PlatformContextResponse["status"], string> = {
  ready: "이용 준비가 완료되었습니다.",
  dev_bypass: "개발 환경에서 바로 이용할 수 있습니다.",
  tenant_missing: "소속된 회사 또는 조직 정보가 없어 PhishSense를 시작할 수 없습니다.",
  tenant_selection_required: "이용할 회사 또는 조직을 선택해 주세요.",
  entitlement_pending: "이용 권한 정보를 확인하는 중입니다. 잠시 후 다시 시도해 주세요.",
  entitlement_inactive:
    "현재 소속된 회사 또는 조직에서는 PhishSense를 이용할 수 없습니다.",
  platform_token_missing: "로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.",
  platform_not_configured:
    "서비스 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.",
  platform_unauthorized: "로그인 정보 확인에 실패했습니다. 다시 로그인해 주세요.",
  platform_unavailable: "서비스 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

const getStatusMessage = (status: PlatformContextResponse["status"]) =>
  statusMessageMap[status] || "이용 상태를 확인해 주세요.";

const getStatusMessageByReason = (reason: string | null) => {
  if (!reason) return null;
  return statusMessageMap[reason as PlatformContextResponse["status"]] ?? null;
};

const formatRoleLabel = (role: string) => roleLabelMap[role] ?? role;

const formatEntitlementStatus = (status: string) =>
  entitlementStatusLabelMap[status] ?? status;

export const normalizeReturnTo = (candidate: string | null) => {
  if (!candidate) return "/";
  if (CONTROL_CHAR_PATTERN.test(candidate)) return "/";
  if (ENCODED_SLASH_PATTERN.test(candidate) || ENCODED_BACKSLASH_PATTERN.test(candidate)) {
    return "/";
  }
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//")) return "/";
  if (candidate.includes("\\")) return "/";
  if (candidate.startsWith("/api/auth")) return "/";
  return candidate;
};

export default function Onboarding() {
  const searchParams = useSearchParams();
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));
  const reason = searchParams.get("reason");

  const moveToReturnTo = () => {
    window.location.assign(returnTo);
  };

  const contextQuery = useQuery({
    queryKey: ["auth-platform-context"],
    queryFn: fetchPlatformContext,
    retry: false,
  });

  const selectTenantMutation = useMutation({
    mutationFn: updateTenantContext,
    onSuccess: (data) => {
      if (data.hasAccess && !data.onboardingRequired) {
        moveToReturnTo();
      } else {
        void contextQuery.refetch();
      }
    },
  });

  useEffect(() => {
    if (contextQuery.data?.hasAccess && !contextQuery.data.onboardingRequired) {
      moveToReturnTo();
    }
  }, [contextQuery.data, returnTo]);

  if (contextQuery.isLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        이용 상태를 확인하고 있습니다.
      </div>
    );
  }

  if (contextQuery.isError || !contextQuery.data) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          이용 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void contextQuery.refetch()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  const data = contextQuery.data;
  const tenantOptions = data.tenants ?? [];
  const message = getStatusMessage(data.status);
  const reasonMessage = getStatusMessageByReason(reason);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">현재 상태</p>
        <p className="mt-2">{message}</p>
        {reasonMessage ? (
          <p className="mt-2 text-xs text-muted-foreground">
            이 페이지로 이동한 이유: {reasonMessage}
          </p>
        ) : null}
      </div>

      {data.platformProduct ? (
        <div className="rounded-lg border border-border bg-card p-5 text-sm">
          <p className="font-medium text-foreground">구독 정보</p>
          <div className="mt-3 space-y-1 text-muted-foreground">
            <p>상태: {formatEntitlementStatus(data.platformProduct.status)}</p>
            <p>플랜: {data.platformProduct.plan || "-"}</p>
            <p>좌석 수: {data.platformProduct.seatLimit ?? "-"}</p>
            <p>만료일: {data.platformProduct.expiresAt || "-"}</p>
          </div>
        </div>
      ) : null}

      {data.localEntitlement ? (
        <div className="rounded-lg border border-border bg-card p-5 text-sm">
          <p className="font-medium text-foreground">이용 권한 정보</p>
          <div className="mt-3 space-y-1 text-muted-foreground">
            <p>상태: {formatEntitlementStatus(data.localEntitlement.status)}</p>
            <p>플랜: {data.localEntitlement.planCode || "-"}</p>
            <p>좌석 수: {data.localEntitlement.seatLimit ?? "-"}</p>
            <p>만료일: {data.localEntitlement.expiresAt || "-"}</p>
          </div>
        </div>
      ) : null}

      {data.status === "tenant_selection_required" ? (
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="font-medium text-foreground">회사 또는 조직 선택</p>
          <p className="mt-2 text-sm text-muted-foreground">
            계속하려면 이용할 회사 또는 조직을 선택해 주세요.
          </p>
          <div className="mt-4 space-y-3">
            {tenantOptions.map((tenant) => (
              <button
                key={tenant.tenantId}
                type="button"
                onClick={() => selectTenantMutation.mutate(tenant.tenantId)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted"
                disabled={selectTenantMutation.isPending}
              >
                <span>
                  <span className="block font-medium text-foreground">{tenant.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatRoleLabel(tenant.role)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">선택</span>
              </button>
            ))}
          </div>
          {selectTenantMutation.isError ? (
            <p className="mt-3 text-sm text-red-300">
              회사 또는 조직을 선택하지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={() => void contextQuery.refetch()}>
          상태 새로고침
        </Button>
        <Button
          onClick={moveToReturnTo}
          disabled={data.onboardingRequired}
        >
          계속 진행
        </Button>
      </div>
    </div>
  );
}
