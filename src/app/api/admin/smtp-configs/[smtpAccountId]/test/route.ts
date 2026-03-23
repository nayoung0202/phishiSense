import { NextRequest, NextResponse } from "next/server";
import {
  AdminSmtpError,
  testTenantSmtpConfigById,
} from "@/server/services/adminSmtpService";
import {
  buildReadyTenantErrorResponse,
  requireReadyTenant,
} from "@/server/tenant/currentTenant";

type RouteContext = {
  params: Promise<{
    smtpAccountId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const body = await request.json();
    const { tenantId } = await requireReadyTenant(request);
    const { smtpAccountId } = await params;
    const result = await testTenantSmtpConfigById(tenantId, smtpAccountId, body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminSmtpError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return buildReadyTenantErrorResponse(error, "SMTP 테스트 중 오류가 발생했습니다.");
  }
}
