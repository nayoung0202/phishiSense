import nodemailer, { type Transporter } from "nodemailer";

type TransportConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  allowInvalidTls?: boolean;
};

export class MailerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailerConfigError";
  }
}

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
};

const resolveTransportConfig = (): TransportConfig => {
  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT ?? "";
  const secureValue = process.env.SMTP_SECURE;
  const allowInvalidTlsValue = process.env.SMTP_ALLOW_INVALID_TLS;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    throw new MailerConfigError("SMTP_HOST 환경 변수가 설정되어 있지 않습니다.");
  }

  const port = Number.parseInt(portValue || "587", 10);
  if (Number.isNaN(port) || port <= 0) {
    throw new MailerConfigError("SMTP_PORT 환경 변수에 올바른 숫자 값을 입력하세요.");
  }

  const secure = secureValue ? parseBoolean(secureValue, false) : port === 465;
  const allowInvalidTls = parseBoolean(allowInvalidTlsValue, false);

  if ((user && !pass) || (!user && pass)) {
    throw new MailerConfigError("SMTP_USER와 SMTP_PASS는 함께 설정해야 합니다.");
  }

  const config: TransportConfig = {
    host,
    port,
    secure,
  };

  if (user && pass) {
    config.auth = { user, pass };
  }

  if (allowInvalidTls) {
    config.allowInvalidTls = true;
  }

  return config;
};

let transporterPromise: Promise<Transporter> | null = null;

const createTransporter = async (): Promise<Transporter> => {
  const config = resolveTransportConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    tls: config.allowInvalidTls
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
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

  const prefixedSubject = `[테스트] ${subject}`;
  const plainText = stripHtml(htmlBody);

  const composedHtml = `
    <article style="font-family: 'Inter', 'Spoqa Han Sans Neo', sans-serif; line-height: 1.6; color: #0f172a; background: #f8fafc; padding: 24px;">
      <header style="margin-bottom: 16px;">
        <p style="margin: 0; font-size: 14px; color: #64748b;">이 메일은 사전 검수를 위한 테스트 발송입니다.</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">발신 도메인: ${sendingDomain}</p>
      </header>
      <section style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: rgba(15, 23, 42, 0.04) 0 10px 30px;">
        ${htmlBody}
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
