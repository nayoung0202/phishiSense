import process from "node:process";
import nodemailer, { type Transporter } from "nodemailer";
import { enforceBlackTextForSend } from "./services/enforceBlackTextForSend";

type MailerConfig = {
  host: string;
  user: string;
  pass: string;
  port: number;
  secure: boolean;
};

export class MailerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailerConfigError";
  }
}

export function getMailerConfig(): MailerConfig {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = String(process.env.SMTP_SECURE).toLowerCase() === "true";

  if (!host || !user || !pass) {
    throw new MailerConfigError("smtp_not_configured");
  }

  return { host, user, pass, port, secure };
}

let transporterPromise: Promise<Transporter> | null = null;

const createTransporter = async (): Promise<Transporter> => {
  const config = getMailerConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    await transporter.verify();
  } catch (error) {
    transporter.close();
    throw new MailerConfigError(
      "SMTP 서버에 연결할 수 없습니다. 환경 변수 설정을 다시 확인하세요.",
    );
  }

  return transporter;
};

const getTransporter = () => {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }
  return transporterPromise;
};

type SendTestEmailOptions = {
  recipient: string;
  subject: string;
  htmlBody: string;
  fromName: string;
  fromEmail: string;
  sendingDomain: string;
};

const stripHtml = (value: string) =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export type SendTestEmailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
  envelope: {
    from: string;
    to: string[];
  };
  previewUrl?: string | false;
};

export const sendTestEmail = async ({
  recipient,
  subject,
  htmlBody,
  fromName,
  fromEmail,
  sendingDomain,
}: SendTestEmailOptions): Promise<SendTestEmailResult> => {
  const transporter = await getTransporter();
  const normalizedHtmlBody = enforceBlackTextForSend(htmlBody);

  const prefixedSubject = `[테스트] ${subject}`;
  const plainText = stripHtml(normalizedHtmlBody);

  const composedHtml = `
    <article style="font-family: 'Inter', 'Spoqa Han Sans Neo', sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 24px;">
      <header style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 14px; color: #64748b;">이 메일은 사전 검수를 위한 테스트 발송입니다.</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">발신 도메인: ${sendingDomain}</p>
      </header>
      <section style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: rgba(15, 23, 42, 0.04) 0 10px 30px;">
        ${normalizedHtmlBody}
      </section>
      <footer style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0;">수신자: ${recipient}</p>
        <p style="margin: 4px 0 0;">PhishSense 테스트 발송 · 실 사용자에게 자동으로 전달되지 않습니다.</p>
      </footer>
    </article>
  `;

  const info = await transporter.sendMail({
    envelope: {
      from: fromEmail,
      to: [recipient],
    },
    from: `"${fromName}" <${fromEmail}>`,
    to: recipient,
    subject: prefixedSubject,
    html: composedHtml,
    text: plainText || undefined,
    headers: {
      "X-PhishSense-Preview": "true",
      "X-PhishSense-Sending-Domain": sendingDomain,
    },
  });

  return {
    messageId: info.messageId,
    accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
    rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
    response: info.response,
    envelope: {
      from: info.envelope?.from ?? fromEmail,
      to: Array.isArray(info.envelope?.to) ? info.envelope.to.map(String) : [recipient],
    },
    previewUrl: (info as { previewUrl?: string }).previewUrl ?? false,
  };
};
