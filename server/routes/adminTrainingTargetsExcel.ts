import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { storage } from "../storage";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.toLowerCase().endsWith(".xlsx")
    ) {
      cb(null, true);
    } else {
      cb(new Error("xlsx_only"));
    }
  },
});

const HEADER_TITLES = ["이름", "이메일", "소속", "태그", "상태"] as const;
const REQUIRED_HEADERS = new Set(["이름", "이메일", "소속"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_STATUSES = new Set(["active", "inactive"]);
const FAILURE_LIMIT = 100;

router.get("/training-targets/template.xlsx", async (_req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("훈련대상");
  worksheet.addRow(HEADER_TITLES);
  worksheet.addRow(["홍길동", "honggildong@example.com", "인사팀", "", "active"]);
  worksheet.addRow(["김나영", "nayeong.kim@example.com", "보안팀", "", "active"]);

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="training_targets_template.xlsx"',
  );
  res.send(Buffer.from(buffer));
});

router.post(
  "/training-targets/import",
  upload.single("file"),
  async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "엑셀 파일을 업로드하세요." });
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(file.buffer);
    } catch {
      return res.status(400).json({ message: "엑셀 파일을 해석할 수 없습니다." });
    }

    const worksheet =
      workbook.getWorksheet("훈련대상") ?? workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ message: "워크시트를 찾을 수 없습니다." });
    }

    const headerRow = worksheet.getRow(1);
    const headerMap = new Map<string, number>();
    headerRow.eachCell((cell, colNumber) => {
      const value = String(cell.value ?? "").trim();
      if (value) {
        headerMap.set(value, colNumber);
      }
    });

    for (const header of Array.from(REQUIRED_HEADERS)) {
      if (!headerMap.has(header)) {
        return res.status(400).json({
          message: `필수 컬럼(${header})이 누락되었습니다.`,
        });
      }
    }

    const getCellText = (row: ExcelJS.Row, key: string) => {
      const column = headerMap.get(key);
      if (!column) return "";
      const cell = row.getCell(column);
      const value = cell.text ?? cell.value ?? "";
      return String(value).trim();
    };

    const failures: Array<{ rowNumber: number; email?: string; reason: string }> = [];
    let successCount = 0;
    let failCount = 0;
    let totalRows = 0;

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rawValues = HEADER_TITLES.map((header) => getCellText(row, header));
      const isRowEmpty = rawValues.every((value) => value.length === 0);
      if (isRowEmpty) {
        continue;
      }

      totalRows += 1;
      const name = rawValues[0];
      const email = rawValues[1];
      const org = rawValues[2];
      const tagCell = rawValues[3];
      const statusCell = rawValues[4];

      if (!name || !email || !org) {
        failCount += 1;
        if (failures.length < FAILURE_LIMIT) {
          failures.push({
            rowNumber,
            email,
            reason: "필수 항목(이름/이메일/소속) 누락",
          });
        }
        continue;
      }

      if (!EMAIL_REGEX.test(email)) {
        failCount += 1;
        if (failures.length < FAILURE_LIMIT) {
          failures.push({
            rowNumber,
            email,
            reason: "이메일 형식이 올바르지 않습니다.",
          });
        }
        continue;
      }

      const existing = await storage.findTargetByEmail(email);
      if (existing) {
        failCount += 1;
        if (failures.length < FAILURE_LIMIT) {
          failures.push({
            rowNumber,
            email,
            reason: "중복 이메일로 이미 등록되어 있습니다.",
          });
        }
        continue;
      }

      const normalizedStatus = (statusCell || "active").toLowerCase();
      if (!ALLOWED_STATUSES.has(normalizedStatus)) {
        failCount += 1;
        if (failures.length < FAILURE_LIMIT) {
          failures.push({
            rowNumber,
            email,
            reason: "허용되지 않은 상태 값입니다.",
          });
        }
        continue;
      }

      const tags =
        tagCell.length > 0
          ? tagCell
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
          : null;

      await storage.createTarget({
        name,
        email,
        department: org,
        tags,
        status: normalizedStatus,
      });
      successCount += 1;
    }

    return res.json({
      ok: true,
      totalRows,
      successCount,
      failCount,
      failures,
    });
  },
);

router.use(
  (
    error: any,
    _req: any,
    res: any,
    next: (err?: any) => void,
  ) => {
    if (error?.message === "xlsx_only") {
      return res.status(400).json({ message: "xlsx 파일만 업로드할 수 있습니다." });
    }
    return next(error);
  },
);

export const adminTrainingTargetsExcelRouter = router;
