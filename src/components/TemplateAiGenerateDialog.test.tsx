import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { TEMPLATE_AI_DRAFT_SESSION_KEY } from "@shared/templateAi";
import { server } from "@/mocks/server";
import { TemplateAiGenerateDialog } from "./TemplateAiGenerateDialog";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const buildCandidates = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    subject: `${prefix} 후보 ${index + 1}`,
    body: `<a href="{{LANDING_URL}}">${prefix} 메일 ${index + 1}</a>`,
    maliciousPageContent: `<form action="{{TRAINING_URL}}"><input name="email" /><button type="submit">${prefix} 제출 ${index + 1}</button></form>`,
    summary: `${prefix} 요약 ${index + 1}`,
  }));

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const result = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

  return {
    ...result,
    rerenderWithClient: (nextUi: React.ReactElement) =>
      result.rerender(<QueryClientProvider client={queryClient}>{nextUi}</QueryClientProvider>),
  };
};

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  window.sessionStorage.clear();
});

describe("TemplateAiGenerateDialog", () => {
  it("최초 오픈 시 1단계 옵션 입력만 보인다", () => {
    renderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("1단계. 생성 조건 설정")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "템플릿 생성" })).toBeInTheDocument();
    expect(screen.queryByText("2단계. 후보 비교 및 선택")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "전체 재생성" })).not.toBeInTheDocument();
  });

  it("기타 주제를 선택하면 직접 입력 필드가 보이고 요청에 포함된다", async () => {
    const requests: Array<{ topic: string; customTopic: string }> = [];

    server.use(
      http.post("/api/templates/ai-generate", async ({ request }) => {
        const body = (await request.json()) as { topic: string; customTopic: string };
        requests.push(body);
        return HttpResponse.json({
          candidates: buildCandidates("기타", 4),
        });
      }),
    );

    renderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={() => {}} />);

    fireEvent.pointerDown(screen.getAllByRole("combobox")[0]);
    fireEvent.click(await screen.findByText("기타"));

    const customTopicInput = await screen.findByLabelText("주제 직접 입력");
    fireEvent.change(customTopicInput, {
      target: { value: "사내 행사 안내" },
    });

    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));

    await screen.findByText("2단계. 후보 비교 및 선택");

    expect(requests[0]).toEqual(
      expect.objectContaining({
        topic: "other",
        customTopic: "사내 행사 안내",
      }),
    );
  });

  it("후보 생성 성공 시 2단계 후보 비교 화면으로 전환된다", async () => {
    server.use(
      http.post("/api/templates/ai-generate", () =>
        HttpResponse.json({
          candidates: buildCandidates("초기", 4),
        }),
      ),
    );

    renderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));

    expect(await screen.findByText("2단계. 후보 비교 및 선택")).toBeInTheDocument();
    expect(screen.getByText("초기 후보 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전체 재생성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "선택 제외 나머지 재생성" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "선택한 후보 반영" })).toBeInTheDocument();
  });

  it("옵션 다시 설정 후에도 입력값을 유지하고 후보 비교로 돌아갈 수 있다", async () => {
    let requestCount = 0;

    server.use(
      http.post("/api/templates/ai-generate", () => {
        requestCount += 1;
        return HttpResponse.json({
          candidates: buildCandidates("유지", 4),
        });
      }),
    );

    renderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={() => {}} />);

    fireEvent.change(screen.getByLabelText("추가 요청사항"), {
      target: { value: "내부 공지처럼 보이게 해 주세요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));

    await screen.findByText("2단계. 후보 비교 및 선택");
    fireEvent.click(screen.getByRole("button", { name: "옵션 다시 설정" }));

    expect(screen.getByText("1단계. 생성 조건 설정")).toBeInTheDocument();
    expect(screen.getByLabelText("추가 요청사항")).toHaveValue("내부 공지처럼 보이게 해 주세요.");
    expect(screen.getByRole("button", { name: "후보 비교로 돌아가기" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "후보 비교로 돌아가기" }));

    expect(await screen.findByText("2단계. 후보 비교 및 선택")).toBeInTheDocument();
    expect(requestCount).toBe(1);
  });

  it("모달을 닫았다가 다시 열면 모든 상태가 초기화된다", async () => {
    server.use(
      http.post("/api/templates/ai-generate", () =>
        HttpResponse.json({
          candidates: buildCandidates("초기화", 4),
        }),
      ),
    );

    const onOpenChange = vi.fn();
    const { rerenderWithClient } = renderWithClient(
      <TemplateAiGenerateDialog open={true} onOpenChange={onOpenChange} />,
    );

    fireEvent.change(screen.getByLabelText("추가 요청사항"), {
      target: { value: "닫았다가 다시 열 때 초기화" },
    });
    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));
    await screen.findByText("2단계. 후보 비교 및 선택");

    rerenderWithClient(<TemplateAiGenerateDialog open={false} onOpenChange={onOpenChange} />);
    rerenderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={onOpenChange} />);

    expect(screen.getByText("1단계. 생성 조건 설정")).toBeInTheDocument();
    expect(screen.getByLabelText("추가 요청사항")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "후보 비교로 돌아가기" })).not.toBeInTheDocument();
  });

  it("선택 제외 나머지 재생성은 선택 후보를 preservedCandidates로 보낸다", async () => {
    const requests: Array<{
      generateCount: number;
      preservedCandidates: Array<{ id: string; subject: string }>;
    }> = [];

    server.use(
      http.post("/api/templates/ai-generate", async ({ request }) => {
        const body = (await request.json()) as {
          generateCount: number;
          preservedCandidates: Array<{ id: string; subject: string }>;
        };
        requests.push(body);

        return HttpResponse.json({
          candidates: buildCandidates(`재생성-${requests.length}`, body.generateCount),
        });
      }),
    );

    renderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));
    await screen.findByText("2단계. 후보 비교 및 선택");

    fireEvent.click(screen.getAllByRole("button", { name: "이 후보 선택" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "선택 제외 나머지 재생성" }));

    await waitFor(() => {
      expect(requests).toHaveLength(2);
    });

    expect(requests[1]).toEqual({
      generateCount: 3,
      preservedCandidates: [{ id: "재생성-1-1", subject: "재생성-1 후보 1" }],
    });
  });

  it("전체 재생성은 preservedCandidates 없이 후보 4개를 다시 요청한다", async () => {
    const requests: Array<{
      generateCount: number;
      preservedCandidates: Array<{ id: string; subject: string }>;
    }> = [];

    server.use(
      http.post("/api/templates/ai-generate", async ({ request }) => {
        const body = (await request.json()) as {
          generateCount: number;
          preservedCandidates: Array<{ id: string; subject: string }>;
        };
        requests.push(body);

        return HttpResponse.json({
          candidates: buildCandidates(`전체-${requests.length}`, body.generateCount),
        });
      }),
    );

    renderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));
    await screen.findByText("2단계. 후보 비교 및 선택");

    fireEvent.click(screen.getByRole("button", { name: "전체 재생성" }));

    await waitFor(() => {
      expect(requests).toHaveLength(2);
    });

    expect(requests[1]).toEqual({
      generateCount: 4,
      preservedCandidates: [],
    });
  });

  it("선택한 후보 반영은 세션 초안을 저장하고 작성 화면으로 이동한다", async () => {
    server.use(
      http.post("/api/templates/ai-generate", () =>
        HttpResponse.json({
          candidates: buildCandidates("반영", 4),
        }),
      ),
    );

    renderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));
    await screen.findByText("2단계. 후보 비교 및 선택");

    fireEvent.click(screen.getAllByRole("button", { name: "이 후보 선택" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "선택한 후보 반영" }));

    const savedDraft = window.sessionStorage.getItem(TEMPLATE_AI_DRAFT_SESSION_KEY);
    expect(savedDraft).not.toBeNull();
    expect(savedDraft).toContain("반영 후보 1");
    expect(pushMock).toHaveBeenCalledWith("/templates/new?source=ai");
  });
});
