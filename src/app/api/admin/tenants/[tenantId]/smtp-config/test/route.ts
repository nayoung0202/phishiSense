import { NextRequest, NextResponse } from "next/server";
import { AdminSmtpError, testTenantSmtpConfig } from "@/server/services/adminSmtpService";

type RouteContext = {
  params: Promise<{
    tenantId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const body = await request.json();
    const { tenantId } = await params;
    const result = await testTenantSmtpConfig(tenantId, body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminSmtpError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ message: "SMTP 테스트 중 오류가 발생했습니다." }, { status: 500 });
  }
}
