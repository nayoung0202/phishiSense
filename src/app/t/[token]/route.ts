import { NextResponse } from "next/server";
import { storage } from "@/server/storage";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const buildHtmlResponse = (message: string, status: number) =>
  new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8" /><title>훈련 안내</title></head><body><p>${message}</p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
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

    const project = await storage.getProjectByTrainingLinkToken(normalized);
    if (!project || !project.trainingPageId) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    const trainingPage = await storage.getTrainingPage(project.trainingPageId);
    if (!trainingPage) {
      return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
    }

    if (trainingPage.status === "inactive") {
      return buildHtmlResponse("훈련 안내 페이지가 비활성 상태입니다.", 404);
    }

    return new NextResponse(trainingPage.content, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch {
    return buildHtmlResponse("페이지를 찾을 수 없습니다.", 404);
  }
}
