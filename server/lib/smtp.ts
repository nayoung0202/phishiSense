import nodemailer from "nodemailer";
import type { TenantSmtpConfig } from "./db";

type SendTestEmailOptions = {
  smtpConfig: TenantSmtpConfig;
  toEmail: string;
};

const TEST_SUBJECT = "[PhishSense] SMTP 연결 테스트";

export async function sendTestEmail({ smtpConfig, toEmail }: SendTestEmailOptions) {
  const isSmtps = smtpConfig.securityMode === "SMTPS";
  const isStarttls = smtpConfig.securityMode === "STARTTLS";

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
    await transport.sendMail({
      from: smtpConfig.fromName
        ? `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`
        : smtpConfig.fromEmail,
      to: toEmail,
      replyTo: smtpConfig.replyTo ?? undefined,
      subject: TEST_SUBJECT,
      text: "PhishSense SMTP 설정 테스트 메일입니다.",
      html: "<p>PhishSense SMTP 설정 테스트 메일입니다.</p>",
    });
  } finally {
    if (typeof transport.close === "function") {
      transport.close();
    }
  }
}
