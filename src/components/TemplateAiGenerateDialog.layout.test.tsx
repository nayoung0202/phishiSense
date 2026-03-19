import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { TemplateAiGenerateDialog } from "./TemplateAiGenerateDialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const buildCandidates = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    subject: `${prefix} candidate ${index + 1}`,
    body: `<a href="{{LANDING_URL}}">${prefix} mail ${index + 1}</a>`,
    maliciousPageContent: `<form action="{{TRAINING_URL}}"><input name="email" /><button type="submit">${prefix} submit ${index + 1}</button></form>`,
    summary: `${prefix} summary ${index + 1}`,
  }));

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

afterEach(() => {
  cleanup();
});

describe("TemplateAiGenerateDialog layout", () => {
  it("keeps the candidate compare dialog constrained", async () => {
    server.use(
      http.post("/api/templates/ai-generate", () =>
        HttpResponse.json({
          candidates: buildCandidates("size", 4),
        }),
      ),
    );

    renderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));
    await screen.findByText("2단계. 후보 비교 및 선택");

    expect(screen.getByTestId("template-ai-candidates-dialog")).toHaveClass(
      "max-w-[1120px]",
      "max-h-[88vh]",
    );
  });

  it("renders non-interactive shadow DOM previews for generated candidates", async () => {
    server.use(
      http.post("/api/templates/ai-generate", () =>
        HttpResponse.json({
          candidates: buildCandidates("shadow", 4),
        }),
      ),
    );

    renderWithClient(<TemplateAiGenerateDialog open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "템플릿 생성" }));
    await screen.findByText("2단계. 후보 비교 및 선택");

    const frames = await screen.findAllByTitle("template-preview-frame");
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].shadowRoot?.innerHTML).toContain("pointer-events: none !important;");
  });
});
