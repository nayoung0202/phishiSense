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
  type ReportTemplate,
  type InsertReportTemplate,
  type ReportInstance,
  type InsertReportInstance,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eachDayOfInterval, getISOWeek } from "date-fns";
import { normalizePlainText } from "./lib/validation/text";
import { generateTrainingLinkToken } from "./lib/trainingLink";
import { sanitizeHtml } from "./utils/sanitizeHtml";
import { shouldStartScheduledProject } from "./services/projectsShared";
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
import {
  listReportTemplates,
  getReportTemplateById,
  getActiveReportTemplate as getActiveReportTemplateRecord,
  createReportTemplate as createReportTemplateRecord,
  setActiveReportTemplate as setActiveReportTemplateRecord,
} from "./dao/reportTemplateDao";
import {
  listReportInstancesByProject,
  getReportInstanceById,
  createReportInstance as createReportInstanceRecord,
  updateReportInstance as updateReportInstanceRecord,
} from "./dao/reportInstanceDao";
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

  // Report Templates
  getReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  getActiveReportTemplate(): Promise<ReportTemplate | undefined>;
  createReportTemplate(
    template: InsertReportTemplate,
    options?: { activate?: boolean; id?: string },
  ): Promise<ReportTemplate>;
  setActiveReportTemplate(id: string): Promise<ReportTemplate | undefined>;

  // Report Instances
  getReportInstances(projectId: string): Promise<ReportInstance[]>;
  getReportInstance(id: string): Promise<ReportInstance | undefined>;
  createReportInstance(instance: InsertReportInstance): Promise<ReportInstance>;
  updateReportInstance(
    id: string,
    instance: Partial<InsertReportInstance> & { completedAt?: Date | null },
  ): Promise<ReportInstance | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private templates: Map<string, Template>;
  private trainingPages: Map<string, TrainingPage>;
  private projectTargets: Map<string, ProjectTarget>;
  private reportTemplates: Map<string, ReportTemplate>;
  private reportInstances: Map<string, ReportInstance>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.templates = new Map();
    this.trainingPages = new Map();
    this.projectTargets = new Map();
    this.reportTemplates = new Map();
    this.reportInstances = new Map();

    this.seedTemplates();
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

  private async syncScheduledProjects(projects: Project[]): Promise<Project[]> {
    const now = new Date();
    const toStart = projects.filter((project) => shouldStartScheduledProject(project, now));
    if (toStart.length === 0) return projects;

    const updated = await Promise.all(
      toStart.map((project) => updateProjectById(project.id, { status: "진행중" })),
    );
    const updatedMap = new Map<string, Project>();
    updated.forEach((project) => {
      if (project) updatedMap.set(project.id, project);
    });

    return projects.map((project) => updatedMap.get(project.id) ?? project);
  }

  private async startScheduledProject(project: Project): Promise<Project> {
    const updated = await updateProjectById(project.id, { status: "진행중" });
    return updated ?? { ...project, status: "진행중" };
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

  private seedTemplates() {
    DEFAULT_TEMPLATES.forEach((template) => {
      const createdAt = this.parseDate(template.createdAt);
      const updatedAt = this.parseDate(template.updatedAt, createdAt);
      this.templates.set(template.id, {
        ...template,
        body: sanitizeHtml(template.body ?? ""),
        maliciousPageContent: sanitizeHtml(template.maliciousPageContent ?? ""),
        createdAt,
        updatedAt,
      });
    });
  }

  private seedData() {
    const [template1, template2, template3] = DEFAULT_TEMPLATES;

    // Seed projects
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
    type ProjectMetricOverride = {
      targetCount: number;
      openCount: number;
      clickCount: number;
      submitCount: number;
      status?: Project["status"];
    };

    const monthlyThemePool: Array<Pick<MonthlySetting, "campaignName" | "focusDescription">> = [
      {
        campaignName: "계정 보안 재인증 점검",
        focusDescription:
          "계정 보안 재인증 안내를 사칭한 시나리오로 인증 절차 준수 여부를 확인합니다.",
      },
      {
        campaignName: "거래처 요청 위장 대응 훈련",
        focusDescription:
          "거래처 요청과 납품 일정을 위장한 메일을 중심으로 승인 절차를 점검합니다.",
      },
      {
        campaignName: "복지·근태 정책 안내 점검",
        focusDescription:
          "복지 및 근태 정책 변경 공지를 사칭한 공격 유형에 대한 대응력을 강화합니다.",
      },
      {
        campaignName: "결제·정산 요청 대응 훈련",
        focusDescription:
          "결제 요청과 정산 안내를 위장한 사회공학 패턴에 대비하는 훈련입니다.",
      },
      {
        campaignName: "협력사 보안 점검 공지",
        focusDescription:
          "협력사 보안 점검 요청을 사칭한 메일을 통해 대응 절차를 재확인합니다.",
      },
    ];

    const statusPool: Project["status"][] = ["완료", "진행중", "예약"];
    const getRandomInt = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    const getRandomFloat = (min: number, max: number) => Math.random() * (max - min) + min;
    const pickRandom = <T,>(items: T[]) => items[getRandomInt(0, items.length - 1)];
    const toRate = (value: number) => Number(value.toFixed(2));
    const buildStatusCycle = (length: number) =>
      Array.from({ length }, () => pickRandom(statusPool));
    const buildMetrics = () => {
      const openRate = getRandomFloat(0.7, 0.86);
      const clickRate = Math.min(getRandomFloat(0.12, 0.28), openRate - 0.4);
      const submitRate = Math.min(getRandomFloat(0.04, 0.12), clickRate * 0.6);
      return {
        openRate: toRate(openRate),
        clickRate: toRate(clickRate),
        submitRate: toRate(submitRate),
      };
    };
    const buildTarget = () => ({
      start: getRandomInt(80, 200),
      step: getRandomInt(6, 14),
    });

    const buildMonthlySettings = (year: number, months: number[]) =>
      months.map((month) => {
        const theme = pickRandom(monthlyThemePool);
        return {
          year,
          month,
          campaignName: `${pad(month)}월 ${theme.campaignName}`,
          focusDescription: theme.focusDescription,
          statusCycle: buildStatusCycle(5),
          metrics: buildMetrics(),
          target: buildTarget(),
        };
      });

    const projectMetricOverrides: Record<string, ProjectMetricOverride[]> = {
      "2026-01": [
        { targetCount: 220, openCount: 119, clickCount: 15, submitCount: 4, status: "완료" },
        { targetCount: 210, openCount: 124, clickCount: 19, submitCount: 6, status: "완료" },
        { targetCount: 200, openCount: 126, clickCount: 22, submitCount: 8, status: "완료" },
        { targetCount: 190, openCount: 129, clickCount: 25, submitCount: 10, status: "완료" },
        { targetCount: 180, openCount: 130, clickCount: 27, submitCount: 11, status: "완료" },
        { targetCount: 170, openCount: 131, clickCount: 29, submitCount: 12, status: "완료" },
        { targetCount: 160, openCount: 132, clickCount: 32, submitCount: 13, status: "완료" },
      ],
      "2026-02": [],
      "2026-03": [],
    };

    const monthlySettings: MonthlySetting[] = [
      ...buildMonthlySettings(2024, [11, 12]),
      ...buildMonthlySettings(
        2025,
        Array.from({ length: 12 }, (_, index) => index + 1),
      ),
      ...buildMonthlySettings(2026, [1, 2, 3]),
    ];

    const msPerDay = 24 * 60 * 60 * 1000;
    const getRandomProjectCount = (min: number, max: number) => getRandomInt(min, max);
    const monthlyProjects: Project[] = [];
    monthlySettings.forEach((setting) => {
      const lastDay = new Date(setting.year, setting.month, 0).getDate();
      const monthLabel = `${setting.year}년 ${pad(setting.month)}월`;
      const overrideKey = `${setting.year}-${pad(setting.month)}`;
      const overrides = projectMetricOverrides[overrideKey];
      const monthlyProjectCount = overrides?.length ?? getRandomProjectCount(2, 5);
      for (let i = 0; i < monthlyProjectCount; i++) {
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
        const override = overrides?.[i];
        const targetCount = override?.targetCount ?? setting.target.start + i * setting.target.step;
        const status = override?.status ?? setting.statusCycle[i % setting.statusCycle.length];
        const planned = status === "예약";
        const openCount = planned
          ? null
          : override?.openCount ??
            Math.min(
              targetCount,
              Math.max(0, Math.round(targetCount * setting.metrics.openRate) - (i % 3)),
            );
        const clickCount =
          planned || openCount === null
            ? null
            : override?.clickCount ??
              Math.min(
                openCount,
                Math.max(0, Math.round(openCount * setting.metrics.clickRate) - (i % 2)),
              );
        const submitCount =
          planned || clickCount === null
            ? null
            : override?.submitCount ??
              Math.min(
                clickCount,
                Math.max(0, Math.round(clickCount * setting.metrics.submitRate)),
              );
        const templateId =
          i % 3 === 0 ? template1.id : i % 3 === 1 ? template2.id : template3.id;
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

    const seedProjects = [...monthlyProjects];

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
    const now = new Date();
    for (const [id, project] of this.projects.entries()) {
      if (shouldStartScheduledProject(project, now)) {
        this.projects.set(id, { ...project, status: "진행중" });
      }
    }

    return Array.from(this.projects.values()).sort((a, b) =>
      b.createdAt!.getTime() - a.createdAt!.getTime(),
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    if (shouldStartScheduledProject(project, new Date())) {
      const updated = { ...project, status: "진행중" };
      this.projects.set(id, updated);
      return updated;
    }
    return project;
  }

  async getProjectByTrainingLinkToken(token: string): Promise<Project | undefined> {
    const normalized = token.trim();
    if (!normalized) return undefined;
    const project = Array.from(this.projects.values()).find(
      (project) => project.trainingLinkToken === normalized,
    );
    if (!project) return undefined;
    if (shouldStartScheduledProject(project, new Date())) {
      const updated = { ...project, status: "진행중" };
      this.projects.set(project.id, updated);
      return updated;
    }
    return project;
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
      reportCaptureInboxFileKey: project.reportCaptureInboxFileKey ?? null,
      reportCaptureEmailFileKey: project.reportCaptureEmailFileKey ?? null,
      reportCaptureMaliciousFileKey: project.reportCaptureMaliciousFileKey ?? null,
      reportCaptureTrainingFileKey: project.reportCaptureTrainingFileKey ?? null,
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
    const toTime = (value?: Date | null) => (value ? value.getTime() : 0);
    return Array.from(this.templates.values()).sort(
      (a, b) =>
        toTime(b.updatedAt ?? b.createdAt) - toTime(a.updatedAt ?? a.createdAt),
    );
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const now = new Date();
    const newTemplate: Template = {
      id,
      name: template.name,
      subject: template.subject,
      body: sanitizeHtml(template.body ?? ""),
      maliciousPageContent: sanitizeHtml(template.maliciousPageContent ?? ""),
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const updated: Template = {
      ...existing,
      name: template.name ?? existing.name,
      subject: template.subject ?? existing.subject,
      body:
        typeof template.body === "string"
          ? sanitizeHtml(template.body)
          : existing.body,
      maliciousPageContent:
        template.maliciousPageContent !== undefined
          ? sanitizeHtml(template.maliciousPageContent ?? "")
          : existing.maliciousPageContent,
      updatedAt: new Date(),
    };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
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
      content: sanitizeHtml(page.content ?? ""),
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
      content:
        typeof page.content === "string"
          ? sanitizeHtml(page.content)
          : existing.content,
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

  // Report Templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    return Array.from(this.reportTemplates.values()).sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    return this.reportTemplates.get(id);
  }

  async getActiveReportTemplate(): Promise<ReportTemplate | undefined> {
    return Array.from(this.reportTemplates.values()).find((template) => template.isActive) ?? undefined;
  }

  async createReportTemplate(
    template: InsertReportTemplate,
    options?: { activate?: boolean; id?: string },
  ): Promise<ReportTemplate> {
    const id = options?.id ?? randomUUID();
    const now = new Date();
    if (options?.activate) {
      this.reportTemplates.forEach((value, key) => {
        this.reportTemplates.set(key, { ...value, isActive: false, updatedAt: now });
      });
    }
    const newTemplate: ReportTemplate = {
      id,
      name: template.name,
      version: template.version,
      fileKey: template.fileKey,
      isActive: options?.activate ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.reportTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async setActiveReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    const existing = this.reportTemplates.get(id);
    if (!existing) return undefined;
    const now = new Date();
    this.reportTemplates.forEach((value, key) => {
      this.reportTemplates.set(key, { ...value, isActive: false, updatedAt: now });
    });
    const updated: ReportTemplate = { ...existing, isActive: true, updatedAt: now };
    this.reportTemplates.set(id, updated);
    return updated;
  }

  // Report Instances
  async getReportInstances(projectId: string): Promise<ReportInstance[]> {
    return Array.from(this.reportInstances.values())
      .filter((instance) => instance.projectId === projectId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getReportInstance(id: string): Promise<ReportInstance | undefined> {
    return this.reportInstances.get(id);
  }

  async createReportInstance(instance: InsertReportInstance): Promise<ReportInstance> {
    const id = randomUUID();
    const now = new Date();
    const newInstance: ReportInstance = {
      id,
      projectId: instance.projectId,
      templateId: instance.templateId,
      status: instance.status,
      fileKey: instance.fileKey ?? null,
      errorMessage: instance.errorMessage ?? null,
      createdAt: now,
      completedAt: null,
    };
    this.reportInstances.set(id, newInstance);
    return newInstance;
  }

  async updateReportInstance(
    id: string,
    instance: Partial<InsertReportInstance> & { completedAt?: Date | null },
  ): Promise<ReportInstance | undefined> {
    const existing = this.reportInstances.get(id);
    if (!existing) return undefined;
    const updated: ReportInstance = {
      ...existing,
      ...instance,
      fileKey: instance.fileKey !== undefined ? instance.fileKey ?? null : existing.fileKey,
      errorMessage:
        instance.errorMessage !== undefined ? instance.errorMessage ?? null : existing.errorMessage,
      completedAt:
        instance.completedAt !== undefined ? instance.completedAt ?? null : existing.completedAt,
    };
    this.reportInstances.set(id, updated);
    return updated;
  }
}

export class DbStorage implements IStorage {
  private users: Map<string, User>;
  private seedDefaultsPromise: Promise<void> | null;

  constructor() {
    this.users = new Map();
    this.seedDefaultsPromise = null;

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

  private async syncScheduledProjects(projects: Project[]): Promise<Project[]> {
    const now = new Date();
    const toStart = projects.filter((project) => shouldStartScheduledProject(project, now));
    if (toStart.length === 0) return projects;

    const updated = await Promise.all(
      toStart.map((project) => updateProjectById(project.id, { status: "진행중" })),
    );
    const updatedMap = new Map<string, Project>();
    updated.forEach((project) => {
      if (project) updatedMap.set(project.id, project);
    });

    return projects.map((project) => updatedMap.get(project.id) ?? project);
  }

  private async startScheduledProject(project: Project): Promise<Project> {
    const updated = await updateProjectById(project.id, { status: "진행중" });
    return updated ?? { ...project, status: "진행중" };
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

  async seedDefaults() {
    if (this.seedDefaultsPromise) {
      await this.seedDefaultsPromise;
      return;
    }

    const seedTask = async () => {
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
    };

    this.seedDefaultsPromise = seedTask();
    try {
      await this.seedDefaultsPromise;
    } finally {
      this.seedDefaultsPromise = null;
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
    const projects = await listProjects();
    if (projects.length === 0 && process.env.NODE_ENV !== "production") {
      await this.seedDefaults();
      const seeded = await listProjects();
      return this.syncScheduledProjects(seeded);
    }
    return this.syncScheduledProjects(projects);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const project = await getProjectById(id);
    if (!project) return undefined;
    if (shouldStartScheduledProject(project, new Date())) {
      return this.startScheduledProject(project);
    }
    return project;
  }

  async getProjectByTrainingLinkToken(token: string): Promise<Project | undefined> {
    const normalized = token.trim();
    if (!normalized) return undefined;
    const project = await getProjectByTrainingLinkTokenRecord(normalized);
    if (!project) return undefined;
    if (shouldStartScheduledProject(project, new Date())) {
      return this.startScheduledProject(project);
    }
    return project;
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
      reportCaptureInboxFileKey: project.reportCaptureInboxFileKey ?? null,
      reportCaptureEmailFileKey: project.reportCaptureEmailFileKey ?? null,
      reportCaptureMaliciousFileKey: project.reportCaptureMaliciousFileKey ?? null,
      reportCaptureTrainingFileKey: project.reportCaptureTrainingFileKey ?? null,
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
      reportCaptureInboxFileKey:
        project.reportCaptureInboxFileKey !== undefined
          ? project.reportCaptureInboxFileKey ?? null
          : existing.reportCaptureInboxFileKey ?? null,
      reportCaptureEmailFileKey:
        project.reportCaptureEmailFileKey !== undefined
          ? project.reportCaptureEmailFileKey ?? null
          : existing.reportCaptureEmailFileKey ?? null,
      reportCaptureMaliciousFileKey:
        project.reportCaptureMaliciousFileKey !== undefined
          ? project.reportCaptureMaliciousFileKey ?? null
          : existing.reportCaptureMaliciousFileKey ?? null,
      reportCaptureTrainingFileKey:
        project.reportCaptureTrainingFileKey !== undefined
          ? project.reportCaptureTrainingFileKey ?? null
          : existing.reportCaptureTrainingFileKey ?? null,
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
      reportCaptureInboxFileKey: nextProject.reportCaptureInboxFileKey ?? null,
      reportCaptureEmailFileKey: nextProject.reportCaptureEmailFileKey ?? null,
      reportCaptureMaliciousFileKey: nextProject.reportCaptureMaliciousFileKey ?? null,
      reportCaptureTrainingFileKey: nextProject.reportCaptureTrainingFileKey ?? null,
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
    return createTemplateRecord({
      ...template,
      body: sanitizeHtml(template.body ?? ""),
      maliciousPageContent: sanitizeHtml(template.maliciousPageContent ?? ""),
    });
  }

  async updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined> {
    const sanitizedPayload: Partial<InsertTemplate> = { ...template };
    if (typeof template.body === "string") {
      sanitizedPayload.body = sanitizeHtml(template.body);
    }
    if (template.maliciousPageContent !== undefined) {
      sanitizedPayload.maliciousPageContent = sanitizeHtml(template.maliciousPageContent ?? "");
    }
    return updateTemplateById(id, sanitizedPayload);
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
      content: sanitizeHtml(page.content ?? ""),
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
      content:
        typeof page.content === "string"
          ? sanitizeHtml(page.content)
          : existing.content,
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

  // Report Templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    return listReportTemplates();
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    return getReportTemplateById(id);
  }

  async getActiveReportTemplate(): Promise<ReportTemplate | undefined> {
    return getActiveReportTemplateRecord();
  }

  async createReportTemplate(
    template: InsertReportTemplate,
    options?: { activate?: boolean; id?: string },
  ): Promise<ReportTemplate> {
    return createReportTemplateRecord(template, options);
  }

  async setActiveReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    return setActiveReportTemplateRecord(id);
  }

  // Report Instances
  async getReportInstances(projectId: string): Promise<ReportInstance[]> {
    return listReportInstancesByProject(projectId);
  }

  async getReportInstance(id: string): Promise<ReportInstance | undefined> {
    return getReportInstanceById(id);
  }

  async createReportInstance(instance: InsertReportInstance): Promise<ReportInstance> {
    return createReportInstanceRecord(instance);
  }

  async updateReportInstance(
    id: string,
    instance: Partial<InsertReportInstance> & { completedAt?: Date | null },
  ): Promise<ReportInstance | undefined> {
    return updateReportInstanceRecord(id, instance);
  }
}

export const storage = new DbStorage();
