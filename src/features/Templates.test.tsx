import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import Templates from "./Templates";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

afterEach(() => {
  cleanup();
  pushMock.mockReset();
});

describe("Templates", () => {
  it("악성 메일 본문 미리보기는 iframe으로 격리 렌더링한다", async () => {
    server.use(
      http.get("*/api/templates", () =>
        HttpResponse.json([
          {
            id: "template-1",
            name: "배경 점검 템플릿",
            subject: "보안 공지",
            body: "<style>body{background:#111827;color:#f8fafc;}</style><p>메일 본문</p>",
            maliciousPageContent:
              '<style>body{background:#f3f4f6;}</style><form action="{{TRAINING_URL}}"><button type="submit">배경 변경 제출</button></form>',
            autoInsertLandingEnabled: true,
            autoInsertLandingLabel: "문서 확인하기",
            autoInsertLandingKind: "link",
            autoInsertLandingNewTab: true,
            createdAt: "2026-03-16T00:00:00.000Z",
            updatedAt: "2026-03-16T00:00:00.000Z",
          },
        ]),
      ),
    );

    renderWithClient(<Templates />);

    await screen.findByText("배경 점검 템플릿");
    fireEvent.click(screen.getByTestId("button-preview-template-1"));
    const maliciousTab = await screen.findByRole("tab", { name: "악성 메일 본문" });
    fireEvent.click(maliciousTab);
    if (maliciousTab.getAttribute("data-state") !== "active") {
      fireEvent.keyDown(maliciousTab, { key: "Enter" });
    }

    await waitFor(() => {
      expect(maliciousTab).toHaveAttribute("data-state", "active");
    });

    await waitFor(() => {
      const frames = screen.getAllByTitle("template-preview-frame");
      expect(
        frames.some((frame) => frame.shadowRoot?.innerHTML?.includes("배경 변경 제출")),
      ).toBe(true);
    });
  });
});
