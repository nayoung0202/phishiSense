import nodemailer from "nodemailer";
import type { PersistedSmtpConfig } from "../dao/smtpDao";

type SendTestEmailOptions = {
  smtpConfig: PersistedSmtpConfig;
  toEmail: string;
  subject?: string;
  body?: string;
};

const DEFAULT_TEST_SUBJECT = "테스트 이메일 수신 확인";
const DEFAULT_TEST_BODY = `안녕하세요,
이 메일은 메일 서버 및 템플릿 렌더링이 정상적으로 동작하는지 확인하기 위한
테스트 메일입니다.`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatTestBodyAsHtml = (body: string) => {
  const escaped = escapeHtml(body).replace(/\n/g, "<br />");
  return `<div style="font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif; font-size: 14px; color: #111827; line-height: 1.6;">${escaped}</div>`;
};

export async function sendTestEmail({
  smtpConfig,
  toEmail,
  subject,
  body,
}: SendTestEmailOptions) {
  const isSmtps = smtpConfig.securityMode === "SMTPS";
  const isStarttls = smtpConfig.securityMode === "STARTTLS";
  const resolvedSubject = (subject ?? "").trim() || DEFAULT_TEST_SUBJECT;
  const resolvedBody = (body ?? "").trim() || DEFAULT_TEST_BODY;

  const transport = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: isSmtps,
    requireTLS: isStarttls,
    auth: smtpConfig.username
      ? {
          user: smtpConfig.username,
          pass: smtpConfig.password || "",
        }
      : undefined,
    tls: {
      rejectUnauthorized: smtpConfig.tlsVerify !== false,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  try {
    await transport.verify();
    const senderEmail = smtpConfig.username?.trim() || smtpConfig.fromEmail;
    await transport.sendMail({
      from: smtpConfig.fromName
        ? `"${smtpConfig.fromName}" <${senderEmail}>`
        : senderEmail,
      to: toEmail,
      replyTo: smtpConfig.replyTo ?? undefined,
      subject: resolvedSubject,
      text: resolvedBody,
      html: formatTestBodyAsHtml(resolvedBody),
    });
  } finally {
    if (typeof transport.close === "function") {
      transport.close();
    }
  }
}
