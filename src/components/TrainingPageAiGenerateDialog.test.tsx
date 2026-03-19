import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { TRAINING_PAGE_AI_DRAFT_SESSION_KEY } from "@shared/trainingPageAi";
import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { TrainingPageAiGenerateDialog } from "./TrainingPageAiGenerateDialog";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const buildCandidates = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `${prefix} 후보 ${index + 1}`,
    description: `${prefix} 설명 ${index + 1}`,
    content: `<div><p>${prefix} 학습 안내 ${index + 1}</p></div>`,
    summary: `${prefix} 요약 ${index + 1}`,
  }));

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  window.sessionStorage.clear();
});

describe("TrainingPageAiGenerateDialog", () => {
  it("초기 화면에서 옵션과 첨부파일 입력을 보여준다", () => {
    renderWithClient(<TrainingPageAiGenerateDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("1단계. 생성 조건 설정")).toBeInTheDocument();
    expect(screen.getByLabelText("훈련안내페이지 첨부파일")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 훈련안내페이지 생성" })).toBeInTheDocument();
    expect(screen.getByLabelText("추가 요청사항")).toBeInTheDocument();
    expect(screen.queryByText("문체")).not.toBeInTheDocument();
    expect(screen.queryByText("구분 난이도")).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/주제에 맞는 필수 안전 안내 문구는 자동으로 포함됩니다\./),
    ).toHaveLength(1);
  });

  it("후보 선택 후 초안을 저장하고 페이지 작성 화면으로 이동한다", async () => {
    server.use(
      http.post("/api/training-pages/ai-generate", () =>
        HttpResponse.json({
          candidates: buildCandidates("학습", 4),
        }),
      ),
    );

    renderWithClient(<TrainingPageAiGenerateDialog open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "AI 훈련안내페이지 생성" }));
    await screen.findByText("2단계. 후보 비교 및 선택");

    fireEvent.click(screen.getAllByRole("button", { name: "이 후보 선택" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "선택 후보 반영" }));

    const savedDraft = window.sessionStorage.getItem(TRAINING_PAGE_AI_DRAFT_SESSION_KEY);
    expect(savedDraft).not.toBeNull();
    expect(savedDraft).toContain("학습 후보 1");
    expect(pushMock).toHaveBeenCalledWith("/training-pages/new?source=ai");
  });
});
