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
  type InsertProjectTarget
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eachDayOfInterval, getISOWeek } from "date-fns";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
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
  private templates: Map<string, Template>;
  private targets: Map<string, Target>;
  private trainingPages: Map<string, TrainingPage>;
  private projectTargets: Map<string, ProjectTarget>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.templates = new Map();
    this.targets = new Map();
    this.trainingPages = new Map();
    this.projectTargets = new Map();
    
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

  private seedData() {
    // Seed templates
    const template1: Template = {
      id: randomUUID(),
      name: "배송 알림 템플릿",
      subject: "[긴급] 배송 주소 확인 필요",
      body: "<p>고객님의 주문 건에 대한 배송지 주소 확인이 필요합니다...</p>",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    };
    const template2: Template = {
      id: randomUUID(),
      name: "계정 보안 알림",
      subject: "보안 위협 감지 - 즉시 확인 요망",
      body: "<p>귀하의 계정에서 이상 로그인 시도가 감지되었습니다...</p>",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };
    this.templates.set(template1.id, template1);
    this.templates.set(template2.id, template2);
    
    // Seed projects
    const project1: Project = {
      id: randomUUID(),
      name: "신입사원 대상 보안 교육",
      description:
        "신규 입사자의 보안 인식 강화를 위한 집중 과정입니다. 영업 35%, 개발 25%, 인사 20%, 기타 20% 분포로 구성된 참가자를 대상으로 기본 피싱 대응 절차를 실습합니다.",
      department: "인사부",
      templateId: template2.id,
      trainingPageId: null,
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
      templateId: template1.id,
      trainingPageId: null,
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
      templateId: template1.id,
      trainingPageId: null,
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
      description:
        "결재권자 피싱 대응 능력을 점검하는 시나리오입니다. 관리 80%, 인사 20% 구성으로 2025년 10월 25일 09:00에 시작 예정이며 결재 문서 위장 유형을 테스트합니다.",
      department: "관리부",
      templateId: template2.id,
      trainingPageId: null,
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
      templateId: template1.id,
      trainingPageId: null,
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
      templateId: template1.id,
      trainingPageId: null,
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
      templateId: template2.id,
      trainingPageId: null,
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
      templateId: template1.id,
      trainingPageId: null,
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

    const seedProjects = [
      project1,
      project2,
      project3,
      project4,
      project5,
      project2025Q1,
      project2025Q2,
      project2025Q3,
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
    
    // Seed targets
    for (let i = 1; i <= 10; i++) {
      const baseDepartment = i <= 5 ? "영업부" : "개발부";
      const department =
        i % 3 === 0
          ? `${baseDepartment} 1팀, ${baseDepartment} 2팀`
          : baseDepartment;
      const target: Target = {
        id: randomUUID(),
        name: `직원${i}`,
        email: `employee${i}@company.com`,
        department,
        tags: i % 2 === 0 ? ["신입", "교육필요"] : ["경력"],
        status: "active",
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      };
      this.targets.set(target.id, target);
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

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const startDate = this.parseDate(project.startDate);
    const endDate = this.parseDate(project.endDate, startDate);
    const temporal = this.calculateTemporalFields(startDate, endDate);
    const newProject: Project = {
      id,
      name: project.name,
      description: project.description ?? null,
      department: project.department ?? null,
      templateId: project.templateId ?? null,
      trainingPageId: project.trainingPageId ?? null,
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
      startDate: updatedStart,
      endDate: updatedEnd,
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
    return Array.from(this.templates.values()).sort((a, b) => 
      b.updatedAt!.getTime() - a.updatedAt!.getTime()
    );
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const now = new Date();
    const newTemplate: Template = { 
      ...template, 
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined> {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...template, updatedAt: new Date() };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  // Targets
  async getTargets(): Promise<Target[]> {
    return Array.from(this.targets.values()).sort((a, b) => 
      b.createdAt!.getTime() - a.createdAt!.getTime()
    );
  }

  async getTarget(id: string): Promise<Target | undefined> {
    return this.targets.get(id);
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    const id = randomUUID();
    const newTarget: Target = { 
      id,
      name: target.name,
      email: target.email,
      department: target.department ?? null,
      tags: target.tags ?? null,
      status: target.status ?? null,
      createdAt: new Date(),
    };
    this.targets.set(id, newTarget);
    return newTarget;
  }

  async updateTarget(id: string, target: Partial<InsertTarget>): Promise<Target | undefined> {
    const existing = this.targets.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...target };
    this.targets.set(id, updated);
    return updated;
  }

  async deleteTarget(id: string): Promise<boolean> {
    return this.targets.delete(id);
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
      name: page.name,
      description: page.description ?? null,
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
    const updated = { ...existing, ...page, updatedAt: new Date() };
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

export const storage = new MemStorage();
