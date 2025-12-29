import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z, ZodError } from "zod";
import { storage } from "@/server/storage";
import {
  buildTrainingLinkUrl,
  generateTrainingLinkToken,
  injectTrainingLink,
} from "@/server/lib/trainingLink";
import {
  NODEMAILER_VERSION,
  buildTestEmailHtml,
  findMissingSmtpKey,
  stripHtml,
} from "@/server/services/projectsShared";

const payloadSchema = z
  .object({
    projectId: z.string().trim().min(1).nullish(),
    templateId: z.string().trim().min(1, "템플릿을 선택하세요.").nullish(),
    sendingDomain: z.string().min(1, "발신 도메인을 선택하세요."),
    fromEmail: z.string().email("올바른 발신 이메일 주소를 입력하세요."),
    fromName: z.string().min(1, "발신자 이름을 입력하세요."),
    recipient: z.string().email("유효한 수신 이메일을 입력하세요."),
  })
  .superRefine((data, ctx) => {
    if (!data.projectId && !data.templateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templateId"],
        message: "프로젝트 또는 템플릿을 선택하세요.",
      });
    }
  });

export async function POST(request: NextRequest) {
  const headers = new Headers({
    "X-Mailer-Version": `nodemailer/${NODEMAILER_VERSION}`,
  });
  try {
    const missingKey = findMissingSmtpKey();
    if (missingKey) {
      return NextResponse.json(
        {
          error: "smtp_not_configured",
          reason: `${missingKey} 환경 변수가 누락되어 테스트 메일을 발송할 수 없습니다.`,
        },
        { status: 503, headers },
      );
    }

    const payload = payloadSchema.parse(await request.json());
    const projectId = payload.projectId?.trim();
    const project = projectId ? await storage.getProject(projectId) : undefined;
    if (projectId && !project) {
      return NextResponse.json(
        {
          error: "project_not_found",
          reason: "프로젝트를 찾을 수 없습니다.",
        },
        { status: 404, headers },
      );
    }

    if (project && !project.trainingPageId) {
      return NextResponse.json(
        {
          error: "training_page_missing",
          reason: "프로젝트에 연결된 훈련 안내 페이지가 없습니다.",
        },
        { status: 409, headers },
      );
    }

    const templateId = project?.templateId ?? payload.templateId;
    if (!templateId) {
      return NextResponse.json(
        {
          error: "template_required",
          reason: "프로젝트 또는 템플릿을 선택하세요.",
        },
        { status: 422, headers },
      );
    }

    const template = await storage.getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        {
          error: "template_not_found",
          reason: "선택한 템플릿을 찾을 수 없습니다.",
        },
        { status: 404, headers },
      );
    }

    const sendingDomain =
      (typeof project?.sendingDomain === "string" && project.sendingDomain.trim()) ||
      payload.sendingDomain;
    const fromEmail =
      (typeof project?.fromEmail === "string" && project.fromEmail.trim()) || payload.fromEmail;
    const fromName =
      (typeof project?.fromName === "string" && project.fromName.trim()) || payload.fromName;

    if (sendingDomain.includes("inactive")) {
      return NextResponse.json(
        {
          error: "domain_inactive",
          reason: "선택한 도메인이 비활성 상태입니다.",
        },
        { status: 409, headers },
      );
    }

    const smtpPort = Number(process.env.SMTP_PORT ?? 587);
    const smtpSecure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true";
    const allowInvalidTls =
      String(process.env.SMTP_ALLOW_INVALID_TLS ?? "").toLowerCase() === "true";
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: !allowInvalidTls,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });

    let htmlBody = template.body ?? "";
    if (project) {
      const currentToken =
        typeof project.trainingLinkToken === "string" ? project.trainingLinkToken.trim() : "";
      let trainingLinkToken = currentToken;
      if (!trainingLinkToken) {
        let candidate = generateTrainingLinkToken();
        while (await storage.getProjectByTrainingLinkToken(candidate)) {
          candidate = generateTrainingLinkToken();
        }
        const updated = await storage.updateProject(project.id, {
          trainingLinkToken: candidate,
        });
        trainingLinkToken = updated?.trainingLinkToken ?? candidate;
      }
      const trainingLinkUrl = buildTrainingLinkUrl(trainingLinkToken);
      htmlBody = injectTrainingLink(htmlBody, trainingLinkUrl);
    }
    const subject = template.subject ?? "테스트 메일";
    const prefixedSubject = `[테스트] ${subject}`;
    const composedHtml = buildTestEmailHtml(htmlBody, sendingDomain, payload.recipient);
    const plainText = stripHtml(htmlBody);

    let delivery;
    try {
      delivery = await transporter.sendMail({
        envelope: {
          from: fromEmail,
          to: [payload.recipient],
        },
        from: `"${fromName}" <${fromEmail}>`,
        to: payload.recipient,
        subject: prefixedSubject,
        html: composedHtml,
        text: plainText || undefined,
        headers: {
          "X-PhishSense-Preview": "true",
          "X-PhishSense-Sending-Domain": sendingDomain,
        },
      });
    } finally {
      if (typeof transporter.close === "function") {
        transporter.close();
      }
    }

    return NextResponse.json(
      {
        status: "sent" as const,
        messageId: delivery.messageId,
        accepted: Array.isArray(delivery.accepted) ? delivery.accepted.map(String) : [],
        rejected: Array.isArray(delivery.rejected) ? delivery.rejected.map(String) : [],
        envelope: {
          from: delivery.envelope?.from ?? fromEmail,
          to: Array.isArray(delivery.envelope?.to)
            ? delivery.envelope.to.map(String)
            : [payload.recipient],
        },
        response: delivery.response,
        previewUrl: (delivery as { previewUrl?: string }).previewUrl ?? null,
        processedAt: new Date().toISOString(),
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "validation_error",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 422, headers },
      );
    }
    const isDev = process.env.NODE_ENV !== "production";
    const errorDetails =
      error instanceof Error
        ? {
            message: error.message,
            code: (error as { code?: string }).code,
            command: (error as { command?: string }).command,
            response: (error as { response?: string }).response,
          }
        : null;
    console.error("테스트 메일 발송 실패", error);
    return NextResponse.json(
      {
        error: "test_send_failed",
        reason: "테스트 메일 발송 중 오류가 발생했습니다.",
        details: isDev ? errorDetails : undefined,
      },
      { status: 500, headers },
    );
  }
}
