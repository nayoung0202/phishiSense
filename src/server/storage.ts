import {
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Template,
  type InsertTemplate,
  type Target,
  type InsertTarget,
  type TrainingPage,
  type InsertTrainingPage,
  type ProjectTarget,
  type InsertProjectTarget,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eachDayOfInterval, getISOWeek } from "date-fns";
import { normalizePlainText } from "./lib/validation/text";
import { generateTrainingLinkToken } from "./lib/trainingLink";
import {
  listTemplates,
  getTemplateById,
  createTemplate as createTemplateRecord,
  updateTemplateById,
  deleteTemplateById,
} from "./dao/templateDao";
import {
  listTargets,
  getTargetById,
  findTargetByEmail as findTargetByEmailRecord,
  createTarget as createTargetRecord,
  updateTargetById,
  deleteTargetById,
} from "./dao/targetDao";
import {
  listProjects,
  listProjectsByIds,
  getProjectById,
  getProjectByTrainingLinkToken as getProjectByTrainingLinkTokenRecord,
  createProjectRecord,
  updateProjectById,
  deleteProjectById,
} from "./dao/projectDao";
import {
  listTrainingPages,
  getTrainingPageById,
  createTrainingPageRecord,
  updateTrainingPageById,
  deleteTrainingPageById,
} from "./dao/trainingPageDao";
import {
  listProjectTargets as listProjectTargetsRecord,
  createProjectTargetRecord,
  updateProjectTargetById,
} from "./dao/projectTargetDao";
import { DEFAULT_TEMPLATES } from "./seed/defaultTemplates";
import { seedTemplates } from "./seed/seedTemplates";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectByTrainingLinkToken(token: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  copyProjects(ids: string[]): Promise<Project[]>;
  
  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  
  // Targets
  getTargets(): Promise<Target[]>;
  getTarget(id: string): Promise<Target | undefined>;
  findTargetByEmail(email: string): Promise<Target | undefined>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: string, target: Partial<InsertTarget>): Promise<Target | undefined>;
  deleteTarget(id: string): Promise<boolean>;
  
  // Training Pages
  getTrainingPages(): Promise<TrainingPage[]>;
  getTrainingPage(id: string): Promise<TrainingPage | undefined>;
  createTrainingPage(page: InsertTrainingPage): Promise<TrainingPage>;
  updateTrainingPage(id: string, page: Partial<InsertTrainingPage>): Promise<TrainingPage | undefined>;
  deleteTrainingPage(id: string): Promise<boolean>;
  
  // Project Targets
  getProjectTargets(projectId: string): Promise<ProjectTarget[]>;
  createProjectTarget(projectTarget: InsertProjectTarget): Promise<ProjectTarget>;
  updateProjectTarget(id: string, projectTarget: Partial<InsertProjectTarget>): Promise<ProjectTarget | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private trainingPages: Map<string, TrainingPage>;
  private projectTargets: Map<string, ProjectTarget>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.trainingPages = new Map();
    this.projectTargets = new Map();

    void seedTemplates();
    void this.seedTargets();
    this.seedData();
  }

  private parseDate(value: unknown, fallback?: Date): Date {
    if (value instanceof Date) {
      return new Date(value);
    }
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
    if (fallback) {
      return new Date(fallback);
    }
    const now = new Date();
    now.setMilliseconds(0);
    return now;
  }

  private calculateTemporalFields(startDate: Date, endDate: Date) {
    const safeStart = startDate <= endDate ? startDate : endDate;
    const safeEnd = endDate >= startDate ? endDate : startDate;
    const fiscalYear = safeStart.getFullYear();
    const fiscalQuarter = Math.floor(safeStart.getMonth() / 3) + 1;
    const days = eachDayOfInterval({ start: safeStart, end: safeEnd });
    const weekSet = new Set<number>();
    days.forEach((day) => {
      weekSet.add(getISOWeek(day));
    });
    const weekOfYear = Array.from(weekSet).sort((a, b) => a - b);

    return {
      fiscalYear,
      fiscalQuarter,
      weekOfYear,
    };
  }

  private createTrainingLinkToken() {
    const existingTokens = new Set(
      Array.from(this.projects.values())
        .map((project) => project.trainingLinkToken)
        .filter((token): token is string => typeof token === "string" && token.length > 0),
    );

    let token = generateTrainingLinkToken();
    while (existingTokens.has(token)) {
      token = generateTrainingLinkToken();
    }
    return token;
  }

  private seedData() {
    const [template1, template2, template3] = DEFAULT_TEMPLATES;

    // Seed projects
    const project1: Project = {
      id: randomUUID(),
      name: "신입사원 대상 보안 교육",
      description:
        "신규 입사자의 보안 인식 강화를 위한 집중 과정입니다. 영업 35%, 개발 25%, 인사 20%, 기타 20% 분포로 구성된 참가자를 대상으로 기본 피싱 대응 절차를 실습합니다.",
      department: "인사부",
      departmentTags: ["인사부", "신입교육"],
      templateId: template2.id,
      trainingPageId: null,
      trainingLinkToken: this.createTrainingLinkToken(),
      sendingDomain: "security.phishsense.dev",
      fromName: "정보보안팀",
      fromEmail: "security@company.com",
      timezone: "Asia/Seoul",
      notificationEmails: ["security@company.com"],
      startDate: new Date("2024-09-02"),
      endDate: new Date("2024-09-27"),
      status: "진행중",
      targetCount: 45,
      openCount: 20,
      clickCount: 5,
      submitCount: 2,
      fiscalYear: null,
      fiscalQuarter: null,
      weekOfYear: [],
      createdAt: new Date("2024-08-20"),
    };

    const project2: Project = {
      id: randomUUID(),
      name: "임직원 전체 정기 모의훈련 (1분기)",
      description:
        "전사 보안 인식 점검을 위한 정기 모의훈련입니다. 영업 30%, 기술 25%, 관리 20%, 인사 15%, 기타 10% 구성으로 광범위한 부서를 포괄하며 반응률이 높은 편입니다.",
      department: "전사",
      departmentTags: ["전사", "정기훈련"],
      templateId: template1.id,
      trainingPageId: null,
      trainingLinkToken: this.createTrainingLinkToken(),
      sendingDomain: "security.phishsense.dev",
      fromName: "정보보안팀",
      fromEmail: "security@company.com",
      timezone: "Asia/Seoul",
      notificationEmails: ["security@company.com", "ciso@company.com"],
      startDate: new Date("2024-01-15"),
      endDate: new Date("2024-02-02"),
      status: "완료",
      targetCount: 320,
      openCount: 218,
      clickCount: 58,
      submitCount: 22,
      fiscalYear: null,
      fiscalQuarter: null,
      weekOfYear: [],
      createdAt: new Date("2024-01-02"),
    };

    const project3: Project = {
      id: randomUUID(),
      name: "영업본부 대상 피싱 메일 인식 테스트",
      description:
        "영업본부 대응력을 점검하기 위한 실전형 테스트입니다. 영업 70%, 개발 15%, 관리 15% 비중으로 구성되어 있으며 클릭률이 높아 인식 보완이 필요합니다.",
      department: "영업본부",
      departmentTags: ["영업본부", "집중훈련"],
      templateId: template1.id,
      trainingPageId: null,
      trainingLinkToken: this.createTrainingLinkToken(),
      sendingDomain: "security.phishsense.dev",
      fromName: "정보보안팀",
      fromEmail: "security@company.com",
      timezone: "Asia/Seoul",
      notificationEmails: ["sales@company.com"],
      startDate: new Date("2024-06-03"),
      endDate: new Date("2024-06-21"),
      status: "진행중",
      targetCount: 85,
      openCount: 51,
      clickCount: 23,
      submitCount: 9,
      fiscalYear: null,
      fiscalQuarter: null,
      weekOfYear: [],
      createdAt: new Date("2024-05-24"),
    };

    const project4: Project = {
      id: randomUUID(),
      name: "관리부 대상 내부결재 위장 메일 훈련",
      description: null,
      department: "관리부",
      departmentTags: ["관리부", "4분기", "예약훈련"],
      templateId: template2.id,
      trainingPageId: null,
      trainingLinkToken: this.createTrainingLinkToken(),
      sendingDomain: "security.phishsense.dev",
      fromName: "정보보안팀",
      fromEmail: "security@company.com",
      timezone: "Asia/Seoul",
      notificationEmails: ["compliance@company.com"],
      startDate: new Date("2025-10-25T09:00:00"),
      endDate: new Date("2025-11-08T18:00:00"),
      status: "예약",
      targetCount: 40,
      openCount: null,
      clickCount: null,
      submitCount: null,
      fiscalYear: null,
      fiscalQuarter: null,
      weekOfYear: [],
      createdAt: new Date("2025-09-30"),
    };

    const project5: Project = {
      id: randomUUID(),
      name: "보안담당자 대상 역훈련 (피싱 판별 테스트)",
      description:
        "보안 담당자 그룹을 대상으로 한 판별 역테스트입니다. 참가자 전원이 보안 부서로 구성되어 있으며 인식과 제출률이 매우 높은 것이 특징입니다.",
      department: "보안팀",
      departmentTags: ["보안팀", "역훈련"],
      templateId: template1.id,
      trainingPageId: null,
      trainingLinkToken: this.createTrainingLinkToken(),
      sendingDomain: "security.phishsense.dev",
      fromName: "정보보안팀",
      fromEmail: "security@company.com",
      timezone: "Asia/Seoul",
      notificationEmails: ["soc@company.com"],
      startDate: new Date("2024-03-11"),
      endDate: new Date("2024-03-22"),
      status: "완료",
      targetCount: 25,
      openCount: 23,
      clickCount: 1,
      submitCount: 8,
      fiscalYear: null,
      fiscalQuarter: null,
      weekOfYear: [],
      createdAt: new Date("2024-02-28"),
    };

    const project2025Q1: Project = {
      id: randomUUID(),
      name: "2025년 Q1 전사 피싱 훈련",
      description:
        "2025년 1분기 전사 대상 모의훈련입니다. 훈련 종료 후 결과 보고서가 배포되었습니다.",
      department: "전사",
      departmentTags: ["전사", "정기훈련"],
      templateId: template1.id,
      trainingPageId: null,
      trainingLinkToken: this.createTrainingLinkToken(),
      sendingDomain: "security.phishsense.dev",
      fromName: "정보보안팀",
      fromEmail: "security@company.com",
      timezone: "Asia/Seoul",
      notificationEmails: ["security@company.com"],
      startDate: new Date("2025-01-13T09:00:00"),
      endDate: new Date("2025-01-31T18:00:00"),
      status: "완료",
      targetCount: 310,
      openCount: 240,
      clickCount: 62,
      submitCount: 18,
      fiscalYear: null,
      fiscalQuarter: null,
      weekOfYear: [],
      createdAt: new Date("2024-12-20"),
    };

    const project2025Q2: Project = {
      id: randomUUID(),
      name: "개발본부 대상 심화 피싱 훈련",
      description:
        "개발본부의 보안 인식을 강화하기 위한 심화 과정으로, 실시간 모니터링을 수행 중입니다.",
      department: "개발본부",
      departmentTags: ["개발본부", "심화과정"],
      templateId: template2.id,
      trainingPageId: null,
      trainingLinkToken: this.createTrainingLinkToken(),
      sendingDomain: "security.phishsense.dev",
      fromName: "정보보안팀",
      fromEmail: "security@company.com",
      timezone: "Asia/Seoul",
      notificationEmails: ["devlead@company.com"],
      startDate: new Date("2025-05-06T10:00:00"),
      endDate: new Date("2025-05-24T18:30:00"),
      status: "진행중",
      targetCount: 120,
      openCount: 54,
      clickCount: 19,
      submitCount: 7,
      fiscalYear: null,
      fiscalQuarter: null,
      weekOfYear: [],
      createdAt: new Date("2025-04-15"),
    };

    const project2025Q3: Project = {
      id: randomUUID(),
      name: "2025 Q3 경영지원부 예약 훈련",
      description:
        "경영지원부 임직원을 대상으로 한 예약형 훈련으로, 개인정보 유출 시나리오를 활용합니다.",
      department: "경영지원부",
      departmentTags: ["경영지원부", "예약훈련"],
      templateId: template1.id,
      trainingPageId: null,
      trainingLinkToken: this.createTrainingLinkToken(),
      sendingDomain: "security.phishsense.dev",
      fromName: "정보보안팀",
      fromEmail: "security@company.com",
      timezone: "Asia/Seoul",
      notificationEmails: ["gss@company.com"],
      startDate: new Date("2025-08-19T09:30:00"),
      endDate: new Date("2025-09-02T18:00:00"),
      status: "예약",
      targetCount: 65,
      openCount: null,
      clickCount: null,
      submitCount: null,
      fiscalYear: null,
      fiscalQuarter: null,
      weekOfYear: [],
      createdAt: new Date("2025-07-28"),
    };

    const pad = (value: number) => String(value).padStart(2, "0");
    const daySlots = [2, 5, 8, 11, 14, 17, 20, 23, 26, 28];
    const departmentPool = [
      {
        name: "영업본부",
        tags: ["영업본부", "거래처보호"],
        scenario: "주요 고객 발주서와 납품 일정을 사칭하는 메시지를 통해 승인 절차를 검증합니다.",
        notification: "saleslead@company.com",
      },
      {
        name: "인프라운영실",
        tags: ["인프라운영실", "계정보안"],
        scenario: "VPN 재인증과 클라우드 계정 설정 변경을 요구하는 위장 메일을 탐지하는 훈련입니다.",
        notification: "itops@company.com",
      },
      {
        name: "인사부",
        tags: ["인사부", "교육프로그램"],
        scenario: "인사 발령 및 급여 정산 안내 메일을 위장한 공격 유형을 점검합니다.",
        notification: "hr@company.com",
      },
      {
        name: "재무전략실",
        tags: ["재무전략실", "결재보안"],
        scenario: "지출 결의와 세금계산서를 가장한 승인 요청에 대한 대응력을 높입니다.",
        notification: "financecontrol@company.com",
      },
      {
        name: "생산본부",
        tags: ["생산본부", "현장안전"],
        scenario: "설비 점검 일정을 사칭해 첨부파일 열람을 유도하는 유형을 다룹니다.",
        notification: "plant@company.com",
      },
      {
        name: "연구개발센터",
        tags: ["연구개발센터", "기술보안"],
        scenario: "신제품 자료 열람 요청으로 위장한 기술 유출 위협을 모의합니다.",
        notification: "rndlead@company.com",
      },
    ];
    type MonthlySetting = {
      year: number;
      month: number;
      campaignName: string;
      focusDescription: string;
      statusCycle: Project["status"][];
      metrics: { openRate: number; clickRate: number; submitRate: number };
      target: { start: number; step: number };
    };

    const monthlySettings: MonthlySetting[] = [
      {
        year: 2024,
        month: 1,
        campaignName: "신년 인증 절차 점검",
        focusDescription:
          "연초 계정 초기화 시즌을 악용한 피싱 메일 시나리오로 사용자 인증 절차 준수 여부를 확인합니다.",
        statusCycle: ["완료", "완료", "완료", "완료", "완료"],
        metrics: { openRate: 0.82, clickRate: 0.21, submitRate: 0.08 },
        target: { start: 150, step: 12 },
      },
      {
        year: 2024,
        month: 3,
        campaignName: "봄철 정책 변경 안내 훈련",
        focusDescription:
          "복지·휴가 정책 개편 공지를 사칭한 공격 유형을 중심으로 검증합니다.",
        statusCycle: ["완료", "완료", "완료", "완료", "완료"],
        metrics: { openRate: 0.79, clickRate: 0.22, submitRate: 0.09 },
        target: { start: 110, step: 9 },
      },
      {
        year: 2024,
        month: 6,
        campaignName: "상반기 마감 대응 훈련",
        focusDescription:
          "결산 일정과 청구서 확인 메일을 위장한 사회공학 패턴에 대비합니다.",
        statusCycle: ["완료", "완료", "진행중", "완료", "완료"],
        metrics: { openRate: 0.75, clickRate: 0.2, submitRate: 0.07 },
        target: { start: 95, step: 8 },
      },
      {
        year: 2024,
        month: 8,
        campaignName: "하계 집중 모의훈련",
        focusDescription:
          "휴가철 사회공학 메일을 모사해 대응 체계를 점검하는 프로그램입니다.",
        statusCycle: ["완료", "완료", "완료", "완료", "완료"],
        metrics: { openRate: 0.78, clickRate: 0.23, submitRate: 0.08 },
        target: { start: 60, step: 8 },
      },
      {
        year: 2024,
        month: 9,
        campaignName: "가을 전사 캠페인",
        focusDescription:
          "신규 정책 안내 메일과 결재 알림을 위장한 공격을 중심으로 한 훈련입니다.",
        statusCycle: ["완료", "완료", "진행중", "진행중", "완료"],
        metrics: { openRate: 0.76, clickRate: 0.2, submitRate: 0.07 },
        target: { start: 75, step: 9 },
      },
      {
        year: 2024,
        month: 10,
        campaignName: "4분기 선제 대응 훈련",
        focusDescription:
          "연말 정산·납품 일정 안내를 사칭한 메일을 통해 대응 절차를 선제적으로 점검합니다.",
        statusCycle: ["완료", "완료", "진행중", "진행중", "완료"],
        metrics: { openRate: 0.74, clickRate: 0.19, submitRate: 0.06 },
        target: { start: 90, step: 10 },
      },
      {
        year: 2025,
        month: 1,
        campaignName: "Q1 전사 리프레시 훈련",
        focusDescription:
          "연초 조직 개편 공지를 악용한 사칭 메일로 전사 대응력을 재점검합니다.",
        statusCycle: ["완료", "완료", "완료", "완료", "완료"],
        metrics: { openRate: 0.81, clickRate: 0.24, submitRate: 0.09 },
        target: { start: 200, step: 15 },
      },
      {
        year: 2025,
        month: 5,
        campaignName: "개발본부 심화 프로그램",
        focusDescription:
          "코드 저장소 접근권한과 패키지 서명을 사칭한 메일에 대응하는 심화 훈련입니다.",
        statusCycle: ["진행중", "진행중", "완료", "진행중", "완료"],
        metrics: { openRate: 0.73, clickRate: 0.18, submitRate: 0.05 },
        target: { start: 120, step: 10 },
      },
      {
        year: 2025,
        month: 8,
        campaignName: "하계 통합 대응 프로그램",
        focusDescription:
          "여름철 외부 위탁업체 공지로 위장한 메일을 활용해 공급망 보안 인식을 높입니다.",
        statusCycle: ["진행중", "진행중", "진행중", "진행중", "예약"],
        metrics: { openRate: 0.7, clickRate: 0.17, submitRate: 0.05 },
        target: { start: 130, step: 11 },
      },
      {
        year: 2025,
        month: 9,
        campaignName: "추석 연휴 대비 훈련",
        focusDescription:
          "연휴 전 결제 및 택배 안내를 위장한 공격 유형을 사전 차단하기 위한 훈련입니다.",
        statusCycle: ["예약", "예약", "예약", "진행중", "예약"],
        metrics: { openRate: 0.68, clickRate: 0.16, submitRate: 0.05 },
        target: { start: 115, step: 9 },
      },
      {
        year: 2025,
        month: 10,
        campaignName: "연말 정산 대비 훈련",
        focusDescription:
          "연말 정산, 납품 일정, 투자 제안서를 사칭한 메시지를 가상 시나리오로 구성합니다.",
        statusCycle: ["진행중", "예약", "예약", "진행중", "예약"],
        metrics: { openRate: 0.69, clickRate: 0.16, submitRate: 0.05 },
        target: { start: 140, step: 12 },
      },
    ];

    const msPerDay = 24 * 60 * 60 * 1000;
    const monthlyProjects: Project[] = [];
    monthlySettings.forEach((setting) => {
      const lastDay = new Date(setting.year, setting.month, 0).getDate();
      const monthLabel = `${setting.year}년 ${pad(setting.month)}월`;
      for (let i = 0; i < 10; i++) {
        const departmentInfo = departmentPool[(i + setting.month) % departmentPool.length];
        const baseDay = daySlots[i] ?? daySlots[daySlots.length - 1];
        const startDay = Math.min(baseDay, Math.max(1, lastDay - 2));
        const endDay = Math.min(startDay + 4, lastDay);
        const startDate = new Date(
          `${setting.year}-${pad(setting.month)}-${pad(startDay)}T09:00:00+09:00`,
        );
        const endDate = new Date(
          `${setting.year}-${pad(setting.month)}-${pad(endDay)}T18:00:00+09:00`,
        );
        const targetCount = setting.target.start + i * setting.target.step;
        const status = setting.statusCycle[i % setting.statusCycle.length];
        const planned = status === "예약";
        const openCount = planned
          ? null
          : Math.min(
              targetCount,
              Math.max(0, Math.round(targetCount * setting.metrics.openRate) - (i % 3)),
            );
        const clickCount =
          planned || openCount === null
            ? null
            : Math.min(
                openCount,
                Math.max(0, Math.round(openCount * setting.metrics.clickRate) - (i % 2)),
              );
        const submitCount =
          planned || clickCount === null
            ? null
            : Math.min(
                clickCount,
                Math.max(0, Math.round(clickCount * setting.metrics.submitRate)),
              );
        const templateId = i % 2 === 0 ? template1.id : template2.id;
        const project: Project = {
          id: randomUUID(),
          name: `${monthLabel} ${setting.campaignName} ${i + 1}차`,
          description: `${setting.focusDescription} ${departmentInfo.scenario}`,
          department: departmentInfo.name,
          departmentTags: departmentInfo.tags,
          templateId,
          trainingPageId: null,
          trainingLinkToken: this.createTrainingLinkToken(),
          sendingDomain: "security.phishsense.dev",
          fromName: "정보보안팀",
          fromEmail: "security@company.com",
          timezone: "Asia/Seoul",
          notificationEmails: ["security@company.com", departmentInfo.notification],
          startDate,
          endDate,
          status,
          targetCount,
          openCount,
          clickCount,
          submitCount,
          fiscalYear: null,
          fiscalQuarter: null,
          weekOfYear: [],
          createdAt: new Date(startDate.getTime() - 7 * msPerDay),
        };
        monthlyProjects.push(project);
      }
    });

    const seedProjects = [
      project1,
      project2,
      project3,
      project4,
      project5,
      project2025Q1,
      project2025Q2,
      project2025Q3,
      ...monthlyProjects,
    ];

    seedProjects.forEach((project) => {
      const startDate = this.parseDate(project.startDate);
      const endDate = this.parseDate(project.endDate, startDate);
      const temporal = this.calculateTemporalFields(startDate, endDate);
      project.startDate = startDate;
      project.endDate = endDate;
      project.fiscalYear = temporal.fiscalYear;
      project.fiscalQuarter = temporal.fiscalQuarter;
      project.weekOfYear = temporal.weekOfYear;
      this.projects.set(project.id, project);
    });

    // Seed training pages
    const trainingPage1: TrainingPage = {
      id: randomUUID(),
      name: "악성메일 모의훈련 안내",
      description: "악성메일 모의훈련 참여자 안내 메시지",
      content: `<section class="space-y-4">
  <p>안녕하세요, 정보보안팀입니다.</p>
  <p>지금 보신 메일은 ‘악성메일 모의훈련’의 일환으로 발송된 메일입니다.<br />
  메일을 클릭하거나 정보를 입력하셨더라도 실제 피해는 발생하지 않았습니다.</p>
  <p>🔍 하지만 이런 유형의 메일은 실제 공격에서도 자주 사용됩니다.<br />
  아래 내용을 참고해보세요.</p>
  <h3 class="font-semibold">📘 보안 수칙</h3>
  <ul class="list-disc space-y-1 pl-5 text-sm">
    <li>의심스러운 링크는 클릭하지 않습니다.</li>
    <li>메일 주소와 도메인을 반드시 확인하세요.</li>
    <li>이상 징후 발견 시 즉시 보안팀에 신고해주세요.</li>
  </ul>
  <div class="pt-2">
    👉 <a href="#" class="text-primary underline">보안 인식 교육 바로가기</a>
  </div>
</section>`,
      status: "active",
      createdAt: new Date("2024-09-01"),
      updatedAt: new Date("2024-09-01"),
    };

    const trainingPage2: TrainingPage = {
      id: randomUUID(),
      name: "이메일 모의훈련 공지",
      description: "전 임직원 대상 이메일 모의훈련 공지",
      content: `<section class="space-y-4">
  <p>안녕하세요. 정보보안팀입니다.</p>
  <p>사내 보안 인식 강화를 위해 이메일 모의훈련을 실시합니다.<br />
  이번 훈련은 실제 악성 메일 대응 능력을 점검하기 위한 목적이며,<br />
  메일 내 링크 클릭 및 정보 입력 행동을 모니터링합니다.</p>
  <div class="space-y-2 text-sm">
    <p>✅ <strong>훈련 일정:</strong> 2025년 10월 25일 ~ 2025년 10월 28일</p>
    <p>✅ <strong>훈련 대상:</strong> 전 임직원</p>
    <p>✅ <strong>유의사항:</strong></p>
    <ul class="list-disc space-y-1 pl-5">
      <li>실제 계정 정보나 개인정보는 절대 입력하지 마세요.</li>
      <li>훈련 결과는 익명으로 분석됩니다.</li>
    </ul>
  </div>
  <p>감사합니다.<br />정보보안팀 드림</p>
</section>`,
      status: "active",
      createdAt: new Date("2024-09-15"),
      updatedAt: new Date("2024-09-15"),
    };

    this.trainingPages.set(trainingPage1.id, trainingPage1);
    this.trainingPages.set(trainingPage2.id, trainingPage2);
    const trainingPage3: TrainingPage = {
      id: randomUUID(),
      name: "모의 악성메일 훈련 결과 안내",
      description: "모의 악성메일 훈련 참여자 주의 안내",
      content: `<section class="space-y-4">
  <h3 class="text-lg font-semibold">주의하세요!</h3>
  <p>방금 열람하신 링크는 ‘모의 악성메일 훈련’의 일환으로 제작된 페이지입니다.<br />
  실제 해커가 사용했던 공격 기법과 유사한 형태입니다.</p>
  <div class="rounded-md bg-muted/40 p-4 text-sm">
    <p class="font-medium">📍 실전이라면?</p>
    <p>개인정보나 계정 정보가 유출되었을 수 있습니다.</p>
  </div>
  <div>
    <p class="font-medium">✅ 보안팀 권장사항</p>
    <ol class="list-decimal space-y-1 pl-5 text-sm">
      <li>비밀번호 변경</li>
      <li>이메일 출처 확인 습관화</li>
      <li>보안팀 신고 채널 활용</li>
    </ol>
  </div>
  <div class="pt-2">
    👉 <a href="#" class="text-primary underline">보안 교육 다시보기</a>
  </div>
</section>`,
      status: "active",
      createdAt: new Date("2024-09-20"),
      updatedAt: new Date("2024-09-20"),
    };

    this.trainingPages.set(trainingPage3.id, trainingPage3);
    
  }

  private async seedTargets() {
    const targetsToSeed: InsertTarget[] = [];

    for (let i = 1; i <= 10; i++) {
      const baseDepartment = i <= 5 ? "영업부" : "개발부";
      const department =
        i % 3 === 0
          ? `${baseDepartment} 1팀, ${baseDepartment} 2팀`
          : baseDepartment;
      targetsToSeed.push({
        name: `직원${i}`,
        email: `employee${i}@company.com`,
        department,
        tags: i % 2 === 0 ? ["신입", "교육필요"] : ["경력"],
        status: "active",
      });
    }

    for (const target of targetsToSeed) {
      const existing = await findTargetByEmailRecord(target.email);
      if (existing) continue;
      await this.createTarget(target);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort((a, b) => 
      b.createdAt!.getTime() - a.createdAt!.getTime()
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectByTrainingLinkToken(token: string): Promise<Project | undefined> {
    const normalized = token.trim();
    if (!normalized) return undefined;
    return Array.from(this.projects.values()).find(
      (project) => project.trainingLinkToken === normalized,
    );
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const startDate = this.parseDate(project.startDate);
    const endDate = this.parseDate(project.endDate, startDate);
    const temporal = this.calculateTemporalFields(startDate, endDate);
    const providedToken =
      typeof project.trainingLinkToken === "string" ? project.trainingLinkToken.trim() : "";
    const hasTokenConflict =
      providedToken.length > 0 &&
      Array.from(this.projects.values()).some(
        (existing) => existing.trainingLinkToken === providedToken,
      );
    const trainingLinkToken =
      providedToken.length > 0 && !hasTokenConflict
        ? providedToken
        : this.createTrainingLinkToken();
    const newProject: Project = {
      id,
      name: normalizePlainText(project.name, 200),
      description: project.description ? normalizePlainText(project.description, 2000) : null,
      department: project.department ? normalizePlainText(project.department, 200) : null,
      departmentTags: Array.isArray(project.departmentTags)
        ? project.departmentTags
            .map((tag) => normalizePlainText(tag, 120))
            .filter((tag) => tag.length > 0)
        : [],
      templateId: project.templateId ?? null,
      trainingPageId: project.trainingPageId ?? null,
      trainingLinkToken,
      sendingDomain: project.sendingDomain ? normalizePlainText(project.sendingDomain, 200) : null,
      fromName: project.fromName ? normalizePlainText(project.fromName, 200) : null,
      fromEmail: project.fromEmail ?? null,
      timezone: project.timezone ? normalizePlainText(project.timezone, 64) : "Asia/Seoul",
      notificationEmails: Array.isArray(project.notificationEmails)
        ? project.notificationEmails.map((email) => email.trim())
        : [],
      startDate,
      endDate,
      status: project.status,
      targetCount: project.targetCount ?? null,
      openCount: project.openCount ?? null,
      clickCount: project.clickCount ?? null,
      submitCount: project.submitCount ?? null,
      fiscalYear: temporal.fiscalYear,
      fiscalQuarter: temporal.fiscalQuarter,
      weekOfYear: temporal.weekOfYear,
      createdAt: new Date(),
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updatedStart = project.startDate
      ? this.parseDate(project.startDate)
      : new Date(existing.startDate);
    const updatedEnd = project.endDate
      ? this.parseDate(project.endDate, updatedStart)
      : new Date(existing.endDate);
    const temporal = this.calculateTemporalFields(updatedStart, updatedEnd);

      const updated: Project = {
        ...existing,
        ...project,
        name:
          typeof project.name === "string"
            ? normalizePlainText(project.name, 200)
            : existing.name,
        description:
          typeof project.description === "string"
            ? normalizePlainText(project.description, 2000)
            : existing.description ?? null,
        department:
          typeof project.department === "string"
            ? normalizePlainText(project.department, 200)
            : existing.department ?? null,
        trainingLinkToken:
          typeof project.trainingLinkToken === "string"
            ? project.trainingLinkToken.trim()
            : existing.trainingLinkToken ?? null,
        startDate: updatedStart,
        endDate: updatedEnd,
        departmentTags: Array.isArray(project.departmentTags)
          ? project.departmentTags
              .map((tag) => normalizePlainText(tag, 120))
              .filter((tag) => tag.length > 0)
          : existing.departmentTags ?? [],
        sendingDomain:
          typeof project.sendingDomain === "string"
            ? normalizePlainText(project.sendingDomain, 200)
            : existing.sendingDomain ?? null,
        fromName:
          typeof project.fromName === "string"
            ? normalizePlainText(project.fromName, 200)
            : existing.fromName ?? null,
        fromEmail: project.fromEmail ?? existing.fromEmail ?? null,
        timezone:
          typeof project.timezone === "string"
            ? normalizePlainText(project.timezone, 64)
            : existing.timezone ?? "Asia/Seoul",
        notificationEmails: Array.isArray(project.notificationEmails)
          ? project.notificationEmails.map((email) => email.trim())
          : existing.notificationEmails ?? [],
        fiscalYear: temporal.fiscalYear,
        fiscalQuarter: temporal.fiscalQuarter,
        weekOfYear: temporal.weekOfYear,
        createdAt: existing.createdAt,
      };

    this.projects.set(id, updated);
    return updated;
  }

  async copyProjects(ids: string[]): Promise<Project[]> {
    const copies: Project[] = [];
    const existingNames = new Set(Array.from(this.projects.values()).map((p) => p.name));

    const generateCopyName = (original: string) => {
      const baseName = `${original} 복제`;
      if (!existingNames.has(baseName)) {
        existingNames.add(baseName);
        return baseName;
      }
      let index = 2;
      let candidate = `${baseName} ${index}`;
      while (existingNames.has(candidate)) {
        index += 1;
        candidate = `${baseName} ${index}`;
      }
      existingNames.add(candidate);
      return candidate;
    };

    for (const id of ids) {
      const project = this.projects.get(id);
      if (!project) continue;

      const newId = randomUUID();
      const now = new Date();
      const startDate = new Date(project.startDate);
      const endDate = new Date(project.endDate);
      const temporal = this.calculateTemporalFields(startDate, endDate);
      const copy: Project = {
        ...project,
        id: newId,
        name: generateCopyName(project.name),
        createdAt: now,
        trainingLinkToken: this.createTrainingLinkToken(),
        startDate,
        endDate,
        fiscalYear: temporal.fiscalYear,
        fiscalQuarter: temporal.fiscalQuarter,
        weekOfYear: temporal.weekOfYear,
      };
      this.projects.set(newId, copy);
      copies.push(copy);
    }

    return copies;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return listTemplates();
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return getTemplateById(id);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    return createTemplateRecord(template);
  }

  async updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined> {
    return updateTemplateById(id, template);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return deleteTemplateById(id);
  }

  // Targets
  async getTargets(): Promise<Target[]> {
    return listTargets();
  }

  async getTarget(id: string): Promise<Target | undefined> {
    return getTargetById(id);
  }

  async findTargetByEmail(email: string): Promise<Target | undefined> {
    return findTargetByEmailRecord(email);
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    return createTargetRecord({
      name: normalizePlainText(target.name, 200),
      email: target.email,
      department: target.department ? normalizePlainText(target.department, 200) : null,
      tags: target.tags
        ? target.tags
            .map((tag) => normalizePlainText(tag, 120))
            .filter((tag) => tag.length > 0)
        : null,
      status: target.status ?? "active",
    });
  }

  async updateTarget(id: string, target: Partial<InsertTarget>): Promise<Target | undefined> {
    const existing = await getTargetById(id);
    if (!existing) return undefined;
    return updateTargetById(id, {
      ...target,
      name:
        typeof target.name === "string"
          ? normalizePlainText(target.name, 200)
          : existing.name,
      department:
        typeof target.department === "string"
          ? normalizePlainText(target.department, 200)
          : existing.department ?? null,
      tags: Array.isArray(target.tags)
        ? target.tags
            .map((tag) => normalizePlainText(tag, 120))
            .filter((tag) => tag.length > 0)
        : existing.tags ?? null,
      status:
        typeof target.status === "string"
          ? target.status
          : existing.status ?? "active",
    });
  }

  async deleteTarget(id: string): Promise<boolean> {
    return deleteTargetById(id);
  }

  // Training Pages
  async getTrainingPages(): Promise<TrainingPage[]> {
    return Array.from(this.trainingPages.values()).sort((a, b) => 
      b.updatedAt!.getTime() - a.updatedAt!.getTime()
    );
  }

  async getTrainingPage(id: string): Promise<TrainingPage | undefined> {
    return this.trainingPages.get(id);
  }

  async createTrainingPage(page: InsertTrainingPage): Promise<TrainingPage> {
    const id = randomUUID();
    const now = new Date();
    const newPage: TrainingPage = { 
      id,
      name: normalizePlainText(page.name, 200),
      description: page.description ? normalizePlainText(page.description, 1000) : null,
      content: page.content,
      status: page.status ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.trainingPages.set(id, newPage);
    return newPage;
  }

  async updateTrainingPage(id: string, page: Partial<InsertTrainingPage>): Promise<TrainingPage | undefined> {
    const existing = this.trainingPages.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...page,
      name:
        typeof page.name === "string" ? normalizePlainText(page.name, 200) : existing.name,
      description:
        typeof page.description === "string"
          ? normalizePlainText(page.description, 1000)
          : existing.description ?? null,
      updatedAt: new Date(),
    };
    this.trainingPages.set(id, updated);
    return updated;
  }

  async deleteTrainingPage(id: string): Promise<boolean> {
    return this.trainingPages.delete(id);
  }

  // Project Targets
  async getProjectTargets(projectId: string): Promise<ProjectTarget[]> {
    return Array.from(this.projectTargets.values()).filter(
      pt => pt.projectId === projectId
    );
  }

  async createProjectTarget(projectTarget: InsertProjectTarget): Promise<ProjectTarget> {
    const id = randomUUID();
    const newProjectTarget: ProjectTarget = { 
      id,
      projectId: projectTarget.projectId,
      targetId: projectTarget.targetId,
      status: projectTarget.status ?? null,
      openedAt: projectTarget.openedAt ?? null,
      clickedAt: projectTarget.clickedAt ?? null,
      submittedAt: projectTarget.submittedAt ?? null,
    };
    this.projectTargets.set(id, newProjectTarget);
    return newProjectTarget;
  }

  async updateProjectTarget(id: string, projectTarget: Partial<InsertProjectTarget>): Promise<ProjectTarget | undefined> {
    const existing = this.projectTargets.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...projectTarget };
    this.projectTargets.set(id, updated);
    return updated;
  }
}

export class DbStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();

    void seedTemplates();
    void this.seedTargets();
    void this.seedDefaults();
  }

  private parseDate(value: unknown, fallback?: Date): Date {
    if (value instanceof Date) {
      return new Date(value);
    }
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
    if (fallback) {
      return new Date(fallback);
    }
    const now = new Date();
    now.setMilliseconds(0);
    return now;
  }

  private calculateTemporalFields(startDate: Date, endDate: Date) {
    const safeStart = startDate <= endDate ? startDate : endDate;
    const safeEnd = endDate >= startDate ? endDate : startDate;
    const fiscalYear = safeStart.getFullYear();
    const fiscalQuarter = Math.floor(safeStart.getMonth() / 3) + 1;
    const days = eachDayOfInterval({ start: safeStart, end: safeEnd });
    const weekSet = new Set<number>();
    days.forEach((day) => {
      weekSet.add(getISOWeek(day));
    });
    const weekOfYear = Array.from(weekSet).sort((a, b) => a - b);

    return {
      fiscalYear,
      fiscalQuarter,
      weekOfYear,
    };
  }

  private async generateTrainingLinkToken() {
    let token = generateTrainingLinkToken();
    while (await getProjectByTrainingLinkTokenRecord(token)) {
      token = generateTrainingLinkToken();
    }
    return token;
  }

  private async resolveTrainingLinkToken(value?: string | null) {
    const normalized = (value ?? "").trim();
    if (normalized) {
      const existing = await getProjectByTrainingLinkTokenRecord(normalized);
      if (!existing) return normalized;
    }
    return this.generateTrainingLinkToken();
  }

  private async assertUniqueTrainingLinkToken(token: string, projectId: string) {
    const existing = await getProjectByTrainingLinkTokenRecord(token);
    if (existing && existing.id !== projectId) {
      throw new Error("이미 사용 중인 훈련 링크 토큰입니다.");
    }
  }

  private async seedTargets() {
    const targetsToSeed: InsertTarget[] = [];

    for (let i = 1; i <= 10; i++) {
      const baseDepartment = i <= 5 ? "영업부" : "개발부";
      const department =
        i % 3 === 0
          ? `${baseDepartment} 1팀, ${baseDepartment} 2팀`
          : baseDepartment;
      targetsToSeed.push({
        name: `직원${i}`,
        email: `employee${i}@company.com`,
        department,
        tags: i % 2 === 0 ? ["신입", "교육필요"] : ["경력"],
        status: "active",
      });
    }

    for (const target of targetsToSeed) {
      const existing = await findTargetByEmailRecord(target.email);
      if (existing) continue;
      await this.createTarget(target);
    }
  }

  private async seedDefaults() {
    if (process.env.NODE_ENV === "production") return;

    try {
      const [existingProjects, existingPages] = await Promise.all([
        listProjects(),
        listTrainingPages(),
      ]);

      const shouldSeedProjects = existingProjects.length === 0;
      const shouldSeedPages = existingPages.length === 0;
      if (!shouldSeedProjects && !shouldSeedPages) return;

      const memSeed = new MemStorage();

      if (shouldSeedProjects) {
        const projects = await memSeed.getProjects();
        for (const project of projects) {
          await createProjectRecord({
            id: project.id,
            name: project.name,
            description: project.description,
            department: project.department,
            departmentTags: project.departmentTags ?? [],
            templateId: project.templateId ?? null,
            trainingPageId: project.trainingPageId ?? null,
            trainingLinkToken: project.trainingLinkToken ?? null,
            sendingDomain: project.sendingDomain ?? null,
            fromName: project.fromName ?? null,
            fromEmail: project.fromEmail ?? null,
            timezone: project.timezone ?? null,
            notificationEmails: project.notificationEmails ?? [],
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status,
            targetCount: project.targetCount ?? null,
            openCount: project.openCount ?? null,
            clickCount: project.clickCount ?? null,
            submitCount: project.submitCount ?? null,
            fiscalYear: project.fiscalYear ?? null,
            fiscalQuarter: project.fiscalQuarter ?? null,
            weekOfYear: project.weekOfYear ?? [],
            createdAt: project.createdAt ?? new Date(),
          });
        }
      }

      if (shouldSeedPages) {
        const pages = await memSeed.getTrainingPages();
        for (const page of pages) {
          await createTrainingPageRecord({
            id: page.id,
            name: page.name,
            description: page.description,
            content: page.content,
            status: page.status ?? null,
            createdAt: page.createdAt ?? new Date(),
            updatedAt: page.updatedAt ?? new Date(),
          });
        }
      }
    } catch (error) {
      console.error("[db_seed_defaults_failed]", error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return listProjects();
  }

  async getProject(id: string): Promise<Project | undefined> {
    return getProjectById(id);
  }

  async getProjectByTrainingLinkToken(token: string): Promise<Project | undefined> {
    const normalized = token.trim();
    if (!normalized) return undefined;
    return getProjectByTrainingLinkTokenRecord(normalized);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const startDate = this.parseDate(project.startDate);
    const endDate = this.parseDate(project.endDate, startDate);
    const temporal = this.calculateTemporalFields(startDate, endDate);
    const trainingLinkToken = await this.resolveTrainingLinkToken(project.trainingLinkToken);
    const newProject = {
      id,
      name: normalizePlainText(project.name, 200),
      description: project.description ? normalizePlainText(project.description, 2000) : null,
      department: project.department ? normalizePlainText(project.department, 200) : null,
      departmentTags: Array.isArray(project.departmentTags)
        ? project.departmentTags
            .map((tag) => normalizePlainText(tag, 120))
            .filter((tag) => tag.length > 0)
        : [],
      templateId: project.templateId ?? null,
      trainingPageId: project.trainingPageId ?? null,
      trainingLinkToken,
      sendingDomain: project.sendingDomain ? normalizePlainText(project.sendingDomain, 200) : null,
      fromName: project.fromName ? normalizePlainText(project.fromName, 200) : null,
      fromEmail: project.fromEmail ?? null,
      timezone: project.timezone ? normalizePlainText(project.timezone, 64) : "Asia/Seoul",
      notificationEmails: Array.isArray(project.notificationEmails)
        ? project.notificationEmails.map((email) => email.trim())
        : [],
      startDate,
      endDate,
      status: project.status,
      targetCount: project.targetCount ?? null,
      openCount: project.openCount ?? null,
      clickCount: project.clickCount ?? null,
      submitCount: project.submitCount ?? null,
      fiscalYear: temporal.fiscalYear,
      fiscalQuarter: temporal.fiscalQuarter,
      weekOfYear: temporal.weekOfYear,
      createdAt: new Date(),
    };
    return createProjectRecord(newProject);
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existing = await getProjectById(id);
    if (!existing) return undefined;
    const updatedStart = project.startDate
      ? this.parseDate(project.startDate)
      : new Date(existing.startDate);
    const updatedEnd = project.endDate
      ? this.parseDate(project.endDate, updatedStart)
      : new Date(existing.endDate);
    const temporal = this.calculateTemporalFields(updatedStart, updatedEnd);

    const requestedTokenRaw =
      typeof project.trainingLinkToken === "string" ? project.trainingLinkToken.trim() : null;
    const requestedToken = requestedTokenRaw && requestedTokenRaw.length > 0 ? requestedTokenRaw : null;
    if (requestedToken && requestedToken !== existing.trainingLinkToken) {
      await this.assertUniqueTrainingLinkToken(requestedToken, id);
    }

    const nextProject: Project = {
      ...existing,
      ...project,
      name:
        typeof project.name === "string"
          ? normalizePlainText(project.name, 200)
          : existing.name,
      description:
        typeof project.description === "string"
          ? normalizePlainText(project.description, 2000)
          : existing.description ?? null,
      department:
        typeof project.department === "string"
          ? normalizePlainText(project.department, 200)
          : existing.department ?? null,
      templateId:
        project.templateId !== undefined
          ? project.templateId ?? null
          : existing.templateId ?? null,
      trainingPageId:
        project.trainingPageId !== undefined
          ? project.trainingPageId ?? null
          : existing.trainingPageId ?? null,
      trainingLinkToken: requestedToken ?? existing.trainingLinkToken ?? null,
      startDate: updatedStart,
      endDate: updatedEnd,
      departmentTags: Array.isArray(project.departmentTags)
        ? project.departmentTags
            .map((tag) => normalizePlainText(tag, 120))
            .filter((tag) => tag.length > 0)
        : existing.departmentTags ?? [],
      sendingDomain:
        typeof project.sendingDomain === "string"
          ? normalizePlainText(project.sendingDomain, 200)
          : existing.sendingDomain ?? null,
      fromName:
        typeof project.fromName === "string"
          ? normalizePlainText(project.fromName, 200)
          : existing.fromName ?? null,
      fromEmail: project.fromEmail ?? existing.fromEmail ?? null,
      timezone:
        typeof project.timezone === "string"
          ? normalizePlainText(project.timezone, 64)
          : existing.timezone ?? "Asia/Seoul",
      notificationEmails: Array.isArray(project.notificationEmails)
        ? project.notificationEmails.map((email) => email.trim())
        : existing.notificationEmails ?? [],
      status: project.status ?? existing.status,
      targetCount:
        project.targetCount !== undefined ? project.targetCount ?? null : existing.targetCount ?? null,
      openCount:
        project.openCount !== undefined ? project.openCount ?? null : existing.openCount ?? null,
      clickCount:
        project.clickCount !== undefined ? project.clickCount ?? null : existing.clickCount ?? null,
      submitCount:
        project.submitCount !== undefined ? project.submitCount ?? null : existing.submitCount ?? null,
      fiscalYear: temporal.fiscalYear,
      fiscalQuarter: temporal.fiscalQuarter,
      weekOfYear: temporal.weekOfYear,
      createdAt: existing.createdAt,
    };

    const updated = await updateProjectById(id, {
      name: nextProject.name,
      description: nextProject.description,
      department: nextProject.department,
      departmentTags: nextProject.departmentTags ?? [],
      templateId: nextProject.templateId ?? null,
      trainingPageId: nextProject.trainingPageId ?? null,
      trainingLinkToken: nextProject.trainingLinkToken ?? null,
      sendingDomain: nextProject.sendingDomain ?? null,
      fromName: nextProject.fromName ?? null,
      fromEmail: nextProject.fromEmail ?? null,
      timezone: nextProject.timezone ?? null,
      notificationEmails: nextProject.notificationEmails ?? [],
      startDate: nextProject.startDate,
      endDate: nextProject.endDate,
      status: nextProject.status,
      targetCount: nextProject.targetCount ?? null,
      openCount: nextProject.openCount ?? null,
      clickCount: nextProject.clickCount ?? null,
      submitCount: nextProject.submitCount ?? null,
      fiscalYear: nextProject.fiscalYear ?? null,
      fiscalQuarter: nextProject.fiscalQuarter ?? null,
      weekOfYear: nextProject.weekOfYear ?? [],
    });

    return updated ?? nextProject;
  }

  async copyProjects(ids: string[]): Promise<Project[]> {
    const copies: Project[] = [];
    const [allProjects, selectedProjects] = await Promise.all([
      listProjects(),
      listProjectsByIds(ids),
    ]);
    const projectMap = new Map(selectedProjects.map((project) => [project.id, project]));
    const existingNames = new Set(allProjects.map((project) => project.name));

    const generateCopyName = (original: string) => {
      const baseName = `${original} 복제`;
      if (!existingNames.has(baseName)) {
        existingNames.add(baseName);
        return baseName;
      }
      let index = 2;
      let candidate = `${baseName} ${index}`;
      while (existingNames.has(candidate)) {
        index += 1;
        candidate = `${baseName} ${index}`;
      }
      existingNames.add(candidate);
      return candidate;
    };

    for (const id of ids) {
      const project = projectMap.get(id);
      if (!project) continue;

      const now = new Date();
      const startDate = new Date(project.startDate);
      const endDate = new Date(project.endDate);
      const temporal = this.calculateTemporalFields(startDate, endDate);
      const trainingLinkToken = await this.generateTrainingLinkToken();
      const copyPayload = {
        id: randomUUID(),
        name: generateCopyName(project.name),
        description: project.description ?? null,
        department: project.department ?? null,
        departmentTags: project.departmentTags ?? [],
        templateId: project.templateId ?? null,
        trainingPageId: project.trainingPageId ?? null,
        trainingLinkToken,
        sendingDomain: project.sendingDomain ?? null,
        fromName: project.fromName ?? null,
        fromEmail: project.fromEmail ?? null,
        timezone: project.timezone ?? "Asia/Seoul",
        notificationEmails: project.notificationEmails ?? [],
        startDate,
        endDate,
        status: project.status,
        targetCount: project.targetCount ?? null,
        openCount: project.openCount ?? null,
        clickCount: project.clickCount ?? null,
        submitCount: project.submitCount ?? null,
        fiscalYear: temporal.fiscalYear,
        fiscalQuarter: temporal.fiscalQuarter,
        weekOfYear: temporal.weekOfYear,
        createdAt: now,
      };
      const created = await createProjectRecord(copyPayload);
      copies.push(created);
    }

    return copies;
  }

  async deleteProject(id: string): Promise<boolean> {
    return deleteProjectById(id);
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return listTemplates();
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return getTemplateById(id);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    return createTemplateRecord(template);
  }

  async updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined> {
    return updateTemplateById(id, template);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return deleteTemplateById(id);
  }

  // Targets
  async getTargets(): Promise<Target[]> {
    return listTargets();
  }

  async getTarget(id: string): Promise<Target | undefined> {
    return getTargetById(id);
  }

  async findTargetByEmail(email: string): Promise<Target | undefined> {
    return findTargetByEmailRecord(email);
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    return createTargetRecord({
      name: normalizePlainText(target.name, 200),
      email: target.email,
      department: target.department ? normalizePlainText(target.department, 200) : null,
      tags: target.tags
        ? target.tags
            .map((tag) => normalizePlainText(tag, 120))
            .filter((tag) => tag.length > 0)
        : null,
      status: target.status ?? "active",
    });
  }

  async updateTarget(id: string, target: Partial<InsertTarget>): Promise<Target | undefined> {
    const existing = await getTargetById(id);
    if (!existing) return undefined;
    return updateTargetById(id, {
      ...target,
      name:
        typeof target.name === "string"
          ? normalizePlainText(target.name, 200)
          : existing.name,
      department:
        typeof target.department === "string"
          ? normalizePlainText(target.department, 200)
          : existing.department ?? null,
      tags: Array.isArray(target.tags)
        ? target.tags
            .map((tag) => normalizePlainText(tag, 120))
            .filter((tag) => tag.length > 0)
        : existing.tags ?? null,
      status:
        typeof target.status === "string"
          ? target.status
          : existing.status ?? "active",
    });
  }

  async deleteTarget(id: string): Promise<boolean> {
    return deleteTargetById(id);
  }

  // Training Pages
  async getTrainingPages(): Promise<TrainingPage[]> {
    return listTrainingPages();
  }

  async getTrainingPage(id: string): Promise<TrainingPage | undefined> {
    return getTrainingPageById(id);
  }

  async createTrainingPage(page: InsertTrainingPage): Promise<TrainingPage> {
    const now = new Date();
    const newPage = {
      id: randomUUID(),
      name: normalizePlainText(page.name, 200),
      description: page.description ? normalizePlainText(page.description, 1000) : null,
      content: page.content,
      status: page.status ?? null,
      createdAt: now,
      updatedAt: now,
    };
    return createTrainingPageRecord(newPage);
  }

  async updateTrainingPage(id: string, page: Partial<InsertTrainingPage>): Promise<TrainingPage | undefined> {
    const existing = await getTrainingPageById(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...page,
      name:
        typeof page.name === "string" ? normalizePlainText(page.name, 200) : existing.name,
      description:
        typeof page.description === "string"
          ? normalizePlainText(page.description, 1000)
          : existing.description ?? null,
      updatedAt: new Date(),
    };
    return updateTrainingPageById(id, {
      name: updated.name,
      description: updated.description ?? null,
      content: updated.content,
      status: updated.status ?? null,
      updatedAt: updated.updatedAt,
    });
  }

  async deleteTrainingPage(id: string): Promise<boolean> {
    return deleteTrainingPageById(id);
  }

  // Project Targets
  async getProjectTargets(projectId: string): Promise<ProjectTarget[]> {
    return listProjectTargetsRecord(projectId);
  }

  async createProjectTarget(projectTarget: InsertProjectTarget): Promise<ProjectTarget> {
    const newProjectTarget = {
      id: randomUUID(),
      projectId: projectTarget.projectId,
      targetId: projectTarget.targetId,
      status: projectTarget.status ?? null,
      openedAt: projectTarget.openedAt ?? null,
      clickedAt: projectTarget.clickedAt ?? null,
      submittedAt: projectTarget.submittedAt ?? null,
    };
    return createProjectTargetRecord(newProjectTarget);
  }

  async updateProjectTarget(id: string, projectTarget: Partial<InsertProjectTarget>): Promise<ProjectTarget | undefined> {
    return updateProjectTargetById(id, projectTarget);
  }
}

export const storage = new DbStorage();
