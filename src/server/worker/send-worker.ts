import "dotenv/config";
import process from "node:process";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import nodemailer, { type Transporter } from "nodemailer";
import { pool } from "../db";
import { storage } from "../storage";
import {
  buildLandingUrl,
  buildOpenPixelUrl,
} from "../lib/trainingLink";
import { stripHtml } from "../services/projectsShared";
import { enforceBlackTextForSend } from "../services/enforceBlackTextForSend";
import {
  buildMailHtml,
  formatSendValidationError,
  validateTemplateForSend,
} from "../services/templateSendValidation";

const POLL_INTERVAL_MS = Number(process.env.SEND_WORKER_POLL_MS ?? 1500);
const RATE_LIMIT_MIN_MS = Number(process.env.SEND_WORKER_DELAY_MIN_MS ?? 200);
const RATE_LIMIT_MAX_MS = Number(process.env.SEND_WORKER_DELAY_MAX_MS ?? 400);
const MAX_ATTEMPTS = Number(process.env.SEND_WORKER_MAX_ATTEMPTS ?? 3);

type ClaimedJob = {
  id: string;
};

const normalizeEnv = (value: string | undefined | null) => (value ?? "").trim();

const resolveRateLimitMs = () => {
  const min = Number.isFinite(RATE_LIMIT_MIN_MS) ? RATE_LIMIT_MIN_MS : 200;
  const max = Number.isFinite(RATE_LIMIT_MAX_MS) ? RATE_LIMIT_MAX_MS : 400;
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getSmtpConfig = () => {
  const host = normalizeEnv(process.env.SMTP_HOST);
  const user = normalizeEnv(process.env.SMTP_USER);
  const pass = normalizeEnv(process.env.SMTP_PASS);
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = normalizeEnv(process.env.SMTP_SECURE).toLowerCase() === "true";
  const allowInvalidTls =
    normalizeEnv(process.env.SMTP_ALLOW_INVALID_TLS).toLowerCase() === "true";

  if (!host || !user || !pass) {
    throw new Error("SMTP 환경 변수가 설정되지 않았습니다.");
  }

  return {
    host,
    user,
    pass,
    port,
    secure,
    allowInvalidTls,
  };
};

let transporterPromise: Promise<Transporter> | null = null;

const getTransporter = () => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const config = getSmtpConfig();
      const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: !config.allowInvalidTls,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
      });
      await transport.verify();
      return transport;
    })().catch((error) => {
      transporterPromise = null;
      throw error;
    });
  }
  return transporterPromise;
};

const formatErrorMessage = (error: unknown) => {
  if (!error) return "알 수 없는 오류";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "알 수 없는 오류";
};

const claimNextJob = async (): Promise<ClaimedJob | null> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id
       FROM send_jobs
       WHERE status = 'queued'
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
    );
    const row = result.rows[0] as ClaimedJob | undefined;
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(
      `UPDATE send_jobs
       SET status = 'running', started_at = NOW()
       WHERE id = $1`,
      [row.id],
    );
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const recordJobFailure = async (jobId: string, attempts: number, error: unknown) => {
  const message = formatErrorMessage(error);
  const nextAttempts = attempts + 1;
  if (nextAttempts >= MAX_ATTEMPTS) {
    await storage.updateSendJob(jobId, {
      status: "failed",
      attempts: nextAttempts,
      lastError: message,
      finishedAt: new Date(),
    });
    return;
  }
  await storage.updateSendJob(jobId, {
    status: "queued",
    attempts: nextAttempts,
    lastError: message,
    startedAt: null,
  });
};

const resolveFromInfo = (project: { fromName?: string | null; fromEmail?: string | null }) => {
  const fromName =
    normalizeEnv(project.fromName) || normalizeEnv(process.env.MAIL_FROM_NAME);
  const fromEmail =
    normalizeEnv(project.fromEmail) || normalizeEnv(process.env.MAIL_FROM_EMAIL);
  if (!fromName || !fromEmail) {
    throw new Error("MAIL_FROM_NAME 또는 MAIL_FROM_EMAIL이 설정되지 않았습니다.");
  }
  return { fromName, fromEmail };
};

const processJob = async (jobId: string) => {
  const job = await storage.getSendJob(jobId);
  if (!job) return;

  try {
    const project = await storage.getProject(job.projectId);
    if (!project) {
      throw new Error("프로젝트를 찾을 수 없습니다.");
    }

    const templateId = normalizeEnv(project.templateId);
    if (!templateId) {
      throw new Error("프로젝트에 템플릿이 연결되어 있지 않습니다.");
    }
    const [template, trainingPage] = await Promise.all([
      storage.getTemplate(templateId),
      project.trainingPageId ? storage.getTrainingPage(project.trainingPageId) : Promise.resolve(null),
    ]);
    if (!template) {
      throw new Error("템플릿을 찾을 수 없습니다.");
    }
    const validation = validateTemplateForSend(template, trainingPage);
    if (!validation.ok) {
      const message = formatSendValidationError(validation.issues);
      await storage.updateProject(project.id, { sendValidationError: message });
      await storage.updateSendJob(jobId, {
        status: "failed",
        lastError: message,
        finishedAt: new Date(),
      });
      return;
    }
    await storage.updateProject(project.id, { sendValidationError: null });

    const { fromName, fromEmail } = resolveFromInfo(project);
    const transporter = await getTransporter();

    const [projectTargets, targets] = await Promise.all([
      storage.getProjectTargets(job.projectId),
      storage.getTargets(),
    ]);
    const targetMap = new Map(targets.map((target) => [target.id, target]));

    const eligibleTargets = projectTargets.filter((target) => target.status !== "test");
    const targetsToSend = eligibleTargets.filter(
      (target) => (target.sendStatus ?? "pending") !== "sent",
    );

    let successCount = 0;
    let failCount = 0;

    await storage.updateSendJob(jobId, {
      totalCount: targetsToSend.length,
      successCount: 0,
      failCount: 0,
      lastError: null,
    });

    if (targetsToSend.length === 0) {
      await storage.updateSendJob(jobId, {
        status: "done",
        finishedAt: new Date(),
        successCount,
        failCount,
      });
      return;
    }

    for (const [index, projectTarget] of targetsToSend.entries()) {
      const recipient = targetMap.get(projectTarget.targetId);
      let trackingToken = projectTarget.trackingToken ?? "";

      if (!trackingToken) {
        trackingToken = randomUUID();
        await storage.updateProjectTarget(projectTarget.id, {
          trackingToken,
        });
      }

      if (!recipient?.email) {
        failCount += 1;
        await storage.updateProjectTarget(projectTarget.id, {
          sendStatus: "failed",
          sendError: "대상자 이메일이 존재하지 않습니다.",
        });
        await storage.updateSendJob(jobId, { successCount, failCount });
        if (index < targetsToSend.length - 1) {
          await sleep(resolveRateLimitMs());
        }
        continue;
      }

      const landingUrl = buildLandingUrl(trackingToken);
      const openPixelUrl = buildOpenPixelUrl(trackingToken);
      const { html: htmlBodyRaw } = buildMailHtml(template, landingUrl, openPixelUrl);
      const htmlBody = enforceBlackTextForSend(htmlBodyRaw);
      const plainText = stripHtml(htmlBody);

      try {
        const headers = project.sendingDomain
          ? { "X-PhishSense-Sending-Domain": project.sendingDomain }
          : undefined;
        await transporter.sendMail({
          envelope: {
            from: fromEmail,
            to: [recipient.email],
          },
          from: `"${fromName}" <${fromEmail}>`,
          to: recipient.email,
          subject: template.subject ?? "(제목 없음)",
          html: htmlBody,
          text: plainText || undefined,
          headers,
        });

        successCount += 1;
        await storage.updateProjectTarget(projectTarget.id, {
          sendStatus: "sent",
          sentAt: new Date(),
          sendError: null,
        });
      } catch (error) {
        failCount += 1;
        await storage.updateProjectTarget(projectTarget.id, {
          sendStatus: "failed",
          sendError: formatErrorMessage(error),
        });
      }

      await storage.updateSendJob(jobId, { successCount, failCount });

      if (index < targetsToSend.length - 1) {
        await sleep(resolveRateLimitMs());
      }
    }

    await storage.updateSendJob(jobId, {
      status: "done",
      finishedAt: new Date(),
      successCount,
      failCount,
    });
  } catch (error) {
    await recordJobFailure(jobId, job.attempts ?? 0, error);
  }
};

const startWorker = async () => {
  console.log("[send-worker] 워커를 시작합니다.");
  while (true) {
    try {
      const job = await claimNextJob();
      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      await processJob(job.id);
    } catch (error) {
      console.error("[send-worker] 처리 중 오류", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
};

startWorker().catch((error) => {
  console.error("[send-worker] 시작 실패", error);
  process.exit(1);
});
