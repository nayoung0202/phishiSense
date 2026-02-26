import { beforeEach, describe, expect, it, vi } from "vitest";

const generatorMock = vi.hoisted(() => ({
  generateProjectReport: vi.fn(),
}));

vi.mock("@/server/services/reportGenerator", () => ({
  generateProjectReport: generatorMock.generateProjectReport,
}));

import { POST } from "./route";

describe("POST /api/reports/generate", () => {
  beforeEach(() => {
    generatorMock.generateProjectReport.mockReset();
  });

  it("reportSettingId가 없으면 400을 반환한다", async () => {
    const request = new Request("http://localhost/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "project-1" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(generatorMock.generateProjectReport).not.toHaveBeenCalled();
  });

  it("유효한 요청이면 reportSettingId를 포함해 생성 함수를 호출한다", async () => {
    generatorMock.generateProjectReport.mockResolvedValue({
      instanceId: "instance-1",
      downloadUrl: "/api/reports/instance-1/download",
      fileKey: "reports/generated/instance-1.docx",
    });

    const request = new Request("http://localhost/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "project-1",
        reportSettingId: "setting-1",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(generatorMock.generateProjectReport).toHaveBeenCalledWith("project-1", {
      templateId: undefined,
      reportSettingId: "setting-1",
    });
    expect(body.downloadUrl).toContain("/api/reports/instance-1/download");
  });
});
