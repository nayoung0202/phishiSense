import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("훈련대상");
    worksheet.addRow(["이름", "이메일", "소속", "태그", "상태"]);
    worksheet.addRow(["홍길동", "honggildong@example.com", "인사팀", "", "active"]);
    worksheet.addRow(["김나영", "nayeong.kim@example.com", "보안팀", "", "active"]);

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="training_targets_template.xlsx"',
      },
    });
  } catch {
    return NextResponse.json({ message: "템플릿을 생성하지 못했습니다." }, { status: 500 });
  }
}
