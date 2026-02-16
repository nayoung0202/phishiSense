import { NextResponse } from "next/server";
import { storage } from "@/server/storage";
import {
  buildSubmitFormUrl,
  buildTrainingLinkUrl,
  injectTrainingLink,
} from "@/server/lib/trainingLink";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const trainingTokenMatcher = /\{\{\s*TRAINING_URL\s*\}\}/i;
const trainingTokenReplacer = /\{\{\s*TRAINING_URL\s*\}\}/gi;
const submitTokenMatcher = /\{\{\s*SUBMIT_URL\s*\}\}/i;
const submitTokenReplacer = /\{\{\s*SUBMIT_URL\s*\}\}/gi;
const formTagMatcher = /<form\b/i;
const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: http: https:; font-src data: http: https:; base-uri 'none'; form-action 'self'; frame-ancestors 'none';",
};

const buildHtmlResponse = (message: string, status: number) =>
  new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8" /><title>훈련 시뮬레이션</title></head><body><p>${message}</p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...securityHeaders,
      },
    },
  );

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    const normalized = token?.trim();
    if (!normalized) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    const projectTarget = await storage.getProjectTargetByTrackingToken(normalized);
    if (!projectTarget) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }
    const project = await storage.getProject(projectTarget.projectId);
    if (!project || !project.templateId || !project.trainingPageId) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    const [template, trainingPage] = await Promise.all([
      storage.getTemplate(project.templateId),
      storage.getTrainingPage(project.trainingPageId),
    ]);
    if (!template || !trainingPage) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    const maliciousHtml = template.maliciousPageContent?.trim() ?? "";
    const isFallback = maliciousHtml.length === 0;
    const baseHtml = isFallback ? template.body || "" : maliciousHtml;
    const trainingUrl = buildTrainingLinkUrl(normalized);
    const submitUrl = buildSubmitFormUrl(normalized);
    const hasTrainingToken = trainingTokenMatcher.test(baseHtml);
    const hasSubmitToken = submitTokenMatcher.test(baseHtml);
    const hasFormTag = formTagMatcher.test(baseHtml);

    let renderedHtml = baseHtml
      .replace(trainingTokenReplacer, trainingUrl)
      .replace(submitTokenReplacer, submitUrl);

    if (!hasTrainingToken && !hasSubmitToken && !hasFormTag) {
      renderedHtml = injectTrainingLink(renderedHtml, trainingUrl, {
        replaceSingleAnchor: false,
        replaceFirstAnchor: true,
        replaceFirstButton: true,
        appendType: "button",
      });
    }

    if (isFallback) {
      const isTest = projectTarget.status === "test";
      const banner = isTest
        ? "<div style=\"background:#fef3c7; color:#92400e; padding:12px 16px; border-radius:12px; margin-bottom:16px; font-size:13px; font-weight:600;\">악성 본문이 설정되지 않아 메일 본문을 임시로 표시합니다.</div>"
        : "<div style=\"background:#f8fafc; color:#64748b; padding:8px 12px; border-radius:8px; margin-bottom:12px; font-size:12px;\">콘텐츠 미설정으로 임시 화면을 표시합니다.</div>";
      renderedHtml = `${banner}${renderedHtml}`;
    }

    if (projectTarget) {
      const now = new Date();
      const openedAt = projectTarget.openedAt ?? now;
      const clickedAt = projectTarget.clickedAt ?? now;
      const shouldIncrementOpen = !projectTarget.openedAt;
      const shouldIncrementClick = !projectTarget.clickedAt;
      const nextStatus = projectTarget.status === "submitted" ? "submitted" : "clicked";
      await storage.updateProjectTarget(projectTarget.id, {
        openedAt: shouldIncrementOpen ? openedAt : projectTarget.openedAt,
        clickedAt: shouldIncrementClick ? clickedAt : projectTarget.clickedAt,
        status: nextStatus,
      });
      if ((shouldIncrementOpen || shouldIncrementClick) && projectTarget.status !== "test") {
        await storage.updateProject(project.id, {
          openCount: (project.openCount ?? 0) + (shouldIncrementOpen ? 1 : 0),
          clickCount: (project.clickCount ?? 0) + (shouldIncrementClick ? 1 : 0),
        });
      }
    }

    const response = new NextResponse(renderedHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...securityHeaders,
      },
    });
    response.cookies.set("ps_flow_token", normalized, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch {
    return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
  }
}
