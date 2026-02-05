import type { Project } from "@shared/schema";

type ReportCaptureProjectKey = keyof Pick<
  Project,
  | "reportCaptureInboxFileKey"
  | "reportCaptureEmailFileKey"
  | "reportCaptureMaliciousFileKey"
  | "reportCaptureTrainingFileKey"
>;

export type ReportCaptureKey =
  | "capture_inbox"
  | "capture_email_body"
  | "capture_malicious_page"
  | "capture_training_page";

export const reportCaptureFields: Array<{
  key: ReportCaptureKey;
  label: string;
  description: string;
  projectField: ReportCaptureProjectKey;
}> = [
  {
    key: "capture_inbox",
    label: "메일 수신함",
    description: "메일이 어떻게 도착했는지 확인하는 화면",
    projectField: "reportCaptureInboxFileKey",
  },
  {
    key: "capture_email_body",
    label: "메일 본문",
    description: "메일 본문 화면",
    projectField: "reportCaptureEmailFileKey",
  },
  {
    key: "capture_malicious_page",
    label: "악성 페이지",
    description: "메일 본문에서 링크 클릭 후 화면",
    projectField: "reportCaptureMaliciousFileKey",
  },
  {
    key: "capture_training_page",
    label: "훈련 안내 페이지",
    description: "악성 페이지 폼 전송 후 안내 화면",
    projectField: "reportCaptureTrainingFileKey",
  },
];

export const getMissingReportCaptures = (project?: Project | null) =>
  reportCaptureFields.filter((field) => !project?.[field.projectField]);

export const hasAllReportCaptures = (project?: Project | null) =>
  getMissingReportCaptures(project).length === 0;
