import { NextRequest, NextResponse } from "next/server";
import { setDefaultReportSettingInTenant } from "@/server/tenant/tenantStorage";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId } = await requireReadyTenant(request);
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "설정 ID가 없습니다." }, { status: 400 });
    }
    const updated = await setDefaultReportSettingInTenant(tenantId, id);
    if (!updated) {
      return NextResponse.json({ error: "보고서 설정을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ item: updated });
  } catch (error) {
    return buildReadyTenantErrorResponse(error, "보고서 기본 설정 갱신에 실패했습니다.");
  }
}
