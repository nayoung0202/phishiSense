export type TenantCheckResult = {
  exists: boolean;
  tenantId: string | null;
  plan: string | null;
};

/**
 * 사용자의 테넌트 존재 여부를 확인합니다.
 *
 * MOCK_TENANT=true 일 때는 하드코딩된 mock 데이터를 반환합니다.
 * 실제 platform-api 완성 후 MOCK_TENANT를 제거하면 실제 API를 호출합니다.
 */
export async function checkTenant(userId: string): Promise<TenantCheckResult> {
  if (process.env.MOCK_TENANT === "true") {
    return {
      exists: true,
      tenantId: process.env.DEV_TENANT_ID ?? "tenant-local-001",
      plan: "standard",
    };
  }

  // 실제 platform-api 호출 (개발 완료 후)
  // TODO: platform-api Tenant 엔드포인트 완성 시 아래 주석 해제
  // const response = await fetch(
  //   `${process.env.PLATFORM_API_URL}/tenant/users/${userId}`,
  //   { cache: "no-store" },
  // );
  //
  // if (!response.ok) {
  //   if (response.status === 404) {
  //     return { exists: false, tenantId: null, plan: null };
  //   }
  //   throw new Error(`[tenant] 테넌트 확인 실패 (${response.status})`);
  // }
  //
  // const data = await response.json();
  // return {
  //   exists: true,
  //   tenantId: data.tenantId,
  //   plan: data.plan ?? null,
  // };

  // platform-api 미완성 상태에서 MOCK_TENANT=false이면 신규 사용자로 간주
  return { exists: false, tenantId: null, plan: null };
}
