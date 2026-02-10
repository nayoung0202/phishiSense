import { http, HttpResponse } from "msw";

const baseProject = {
  id: "project-1",
  name: "테스트 프로젝트",
  description: "테스트용 프로젝트",
  department: "영업부",
  departmentTags: ["영업부"],
  templateId: "template-1",
  trainingPageId: "page-1",
  trainingLinkToken: "token-1",
  sendingDomain: "security.example.com",
  fromName: "보안팀",
  fromEmail: "security@example.com",
  timezone: "Asia/Seoul",
  notificationEmails: [],
  startDate: "2025-01-01T00:00:00.000Z",
  endDate: "2025-01-02T00:00:00.000Z",
  status: "진행중",
  targetCount: 3,
  openCount: 1,
  clickCount: 1,
  submitCount: 0,
  reportCaptureInboxFileKey: null,
  reportCaptureEmailFileKey: null,
  reportCaptureMaliciousFileKey: null,
  reportCaptureTrainingFileKey: null,
  fiscalYear: 2025,
  fiscalQuarter: 1,
  weekOfYear: [1],
  createdAt: "2024-12-31T00:00:00.000Z",
};

export const handlers = [
  http.get("http://localhost/api/projects/:id", ({ params }) => {
    return HttpResponse.json({ ...baseProject, id: String(params.id) });
  }),
  http.get("http://localhost/api/projects/:id/action-logs", () => {
    return HttpResponse.json({ items: [] });
  }),
];
