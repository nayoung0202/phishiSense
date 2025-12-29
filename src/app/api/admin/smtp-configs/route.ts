import { NextResponse } from "next/server";
import { fetchSmtpConfigSummaries } from "@/server/services/adminSmtpService";

export async function GET() {
  try {
    const summaries = await fetchSmtpConfigSummaries();
    return NextResponse.json(summaries);
  } catch {
    return NextResponse.json({ message: "SMTP 설정 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
