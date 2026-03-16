import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import ReportSettingsPage from "./ReportSettingsPage";

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("ReportSettingsPage", () => {
  it("목록/페이지네이션을 렌더링한다", async () => {
    server.use(
      http.get("*/api/reports/settings", () =>
        HttpResponse.json({
          items: [
            {
              id: "setting-1",
              name: "기본 설정",
              companyName: "EVRIZ",
              approverName: "홍길동",
              approverTitle: "팀장",
              companyLogoFileKey: "reports/settings/setting-1/logo.png",
              isDefault: true,
              createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
            },
          ],
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        }),
      ),
    );

    renderWithClient(<ReportSettingsPage />);

    expect(await screen.findAllByText("기본 설정")).toHaveLength(2);
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });
});
